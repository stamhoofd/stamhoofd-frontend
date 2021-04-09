import { Decoder } from '@simonbackx/simple-encoding';
import { DecodedRequest, Endpoint, Request, Response } from "@simonbackx/simple-endpoints";
import { SimpleError } from '@simonbackx/simple-errors';
import { EmailRequest, Replacement } from "@stamhoofd/structures";

import Email, { EmailBuilder } from '../email/Email';
import { PasswordToken } from '../models/PasswordToken';
import { Token } from '../models/Token';
import { User } from '../models/User';

type Params = {};
type Query = undefined;
type Body = EmailRequest
type ResponseBody = undefined;

const matchHtmlRegExp = /["'&<>]/
function escapeHtml (string) {
  const str = '' + string
  const match = matchHtmlRegExp.exec(str)

  if (!match) {
    return str
  }

  let escape
  let html = ''
  let index = 0
  let lastIndex = 0

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;'
        break
      case 38: // &
        escape = '&amp;'
        break
      case 39: // '
        escape = '&#39;'
        break
      case 60: // <
        escape = '&lt;'
        break
      case 62: // >
        escape = '&gt;'
        break
      default:
        continue
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index)
    }

    lastIndex = index + 1
    html += escape
  }

  return lastIndex !== index
    ? html + str.substring(lastIndex, index)
    : html
}

/**
 * One endpoint to create, patch and delete groups. Usefull because on organization setup, we need to create multiple groups at once. Also, sometimes we need to link values and update multiple groups at once
 */

export class EmailEndpoint extends Endpoint<Params, Query, Body, ResponseBody> {
    bodyDecoder = EmailRequest as Decoder<EmailRequest>

    protected doesMatch(request: Request): [true, Params] | [false] {
        if (request.method != "POST") {
            return [false];
        }

        const params = Endpoint.parseParameters(request.url, "/email", {});

        if (params) {
            return [true, params as Params];
        }
        return [false];
    }

    async handle(request: DecodedRequest<Params, Query, Body>) {
        const token = await Token.authenticate(request);
        const user = token.user

        if (!user.permissions) {
            throw new SimpleError({
                code: "permission_denied",
                message: "You do not have permissions for this endpoint",
                statusCode: 403
            })
        }

        if (request.body.recipients.length > 1000) {
            throw new SimpleError({
                code: "too_many_recipients",
                message: "Too many recipients",
                human: "Je kan maar een mail naar maximaal 1000 personen tergelijk versturen. Contacteer ons om deze limiet te verhogen indien dit nodig is.",
                field: "recipients"
            })
        }

        // Validate email
        const sender = user.organization.privateMeta.emails.find(e => e.id == request.body.emailId)
        if (!sender) {
            throw new SimpleError({
                code: "invalid_field",
                message: "Invalid emailId",
                human: "Het e-mailadres waarvan je wilt versturen bestaat niet (meer). Kijk je het na?",
                field: "emailId"
            })
        }

        // Validate attachments
        const size = request.body.attachments.reduce((value: number, attachment) => {
            return value + attachment.content.length
        }, 0)
        
        if (size > 9.5*1024*1024) {
            throw new SimpleError({
                code: "too_big_attachments",
                message: "Too big attachments",
                human: "Jouw bericht is te groot. Grote bijlages verstuur je beter niet via e-mail, je plaatst dan best een link naar de locatie in bv. Google Drive. De maximale grootte van een e-mail is 10MB, inclusief het bericht. Als je grote bestanden verstuurt kan je ze ook proberen te verkleinen.",
                field: "attachments"
            })
        }

        const safeContentTypes = [
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif"
        ]

        for (const attachment of request.body.attachments) {
            if (attachment.contentType && !safeContentTypes.includes(attachment.contentType)) {
                throw new SimpleError({
                    code: "content_type_not_supported",
                    message: "Content-Type not supported",
                    human: "Het bestandstype van jouw bijlage wordt niet ondersteund of is onveilig om in een e-mail te plaatsen. Overweeg om je bestand op bv. Google Drive te zetten en de link in jouw e-mail te zetten.",
                    field: "attachments"
                })
            }
        }

        const attachments = request.body.attachments.map((attachment, index) => {
            let filename = "bijlage-"+index;
            
            if (attachment.contentType == "application/pdf") {
                // tmp solution for pdf only
                filename += ".pdf"
            }

            // Correct file name if needed
            if (attachment.filename) {
                filename = attachment.filename.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+/, "").replace(/-+$/, "")
            }

            return {
                filename: filename,
                content: attachment.content,
                contentType: attachment.contentType ?? undefined,
                encoding: "base64"
            }
        })

        let from = user.organization.uri+"@stamhoofd.email";
        let replyTo: string | undefined = sender.email;

        // Can we send from this e-mail or reply-to?
        if (user.organization.privateMeta.mailDomain && user.organization.privateMeta.mailDomainActive && sender.email.endsWith("@"+user.organization.privateMeta.mailDomain)) {
            from = sender.email
            replyTo = undefined;
        }

        // Include name in form field
        if (sender.name) {
            from = '"'+sender.name.replace("\"", "\\\"")+"\" <"+from+">" 
        } else {
            from = '"'+user.organization.name.replace("\"", "\\\"")+"\" <"+from+">" 
        }

        const email = request.body

        // Update recipients
        for (const recipient of email.recipients) {
            
            // Default signInUrl
            let signInUrl = "https://"+user.organization.getHost()+"/login?email="+encodeURIComponent(user.email)

            if (recipient.userId) {
                const recipientUser = await User.getByID(recipient.userId)
                if (recipientUser && recipientUser.organizationId === user.organizationId && recipientUser.email === recipient.email) {
                    // We can create a special token
                    signInUrl = await PasswordToken.getMagicSignInUrl(recipientUser.setRelation(User.organization, user.organization))
                }
            }

            recipient.replacements.push(Replacement.create({
                token: "signInUrl",
                value: signInUrl
            }))
        }

        // Create e-mail builder
        const builder: EmailBuilder = () => {
            const recipient = email.recipients.shift()
            if (!recipient) {
                return undefined
            }

            let html = email.html

            for (const replacement of recipient.replacements) {
                if (html) {
                    html = html.replace("{{"+replacement.token+"}}", escapeHtml(replacement.value))
                }
            }

            return {
                from,
                replyTo,
                to: recipient.email,
                subject: email.subject,
                text: email.text ?? undefined,
                html: html ?? undefined,
                attachments
            }
        }

        Email.schedule(builder)

        // Also send a copy
        const prefix = "<p><i>Kopie e-mail verzonden door "+user.firstName+" "+user.lastName+"</i><br /><br /></p>"
        Email.send({
            from,
            replyTo,
            to: sender.email,
            subject: "[KOPIE] "+email.subject,
            text: "Kopie e-mail verzonden door "+user.firstName+" "+user.lastName+"\n\n"+email.text ?? undefined,
            html: email.html?.replace("<body>", "<body>"+prefix) ?? undefined,
            attachments
        })
        return new Response(undefined);
    }
}
