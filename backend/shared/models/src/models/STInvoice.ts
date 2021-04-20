import { column, ManyToOneRelation, Model } from "@simonbackx/simple-database";
import { Payment as PaymentStruct,STInvoice as STInvoiceStruct,STInvoiceItem, STInvoiceMeta } from '@stamhoofd/structures';
import { v4 as uuidv4 } from "uuid";

import { QueueHandler } from "@stamhoofd/queues";
import { Organization } from './Organization';
import { Payment } from "./Payment";
import { STPackage } from "./STPackage";
import { STPendingInvoice } from "./STPendingInvoice";


export class STInvoice extends Model {
    static table = "stamhoofd_invoices";

    private static numberCache: number | null = null

    // Columns
    @column({
        primary: true, type: "string", beforeSave(value) {
            return value ?? uuidv4();
        }
    })
    id!: string;

    /**
     * Is null for deleted organizations
     */
    @column({ foreignKey: STInvoice.organization, type: "string", nullable: true })
    organizationId: string | null;

    /**
     * Note: always create a new invoice for failed payments. We never create an actual invoice until we received the payment
     */
    @column({ type: "string", nullable: true, foreignKey: STInvoice.payment })
    paymentId: string | null = null
    
    @column({ type: "json", decoder: STInvoiceMeta })
    meta: STInvoiceMeta

    /**
     * If the number is null, no invoice is generated yet. Its still a WIP invoice (not an official one!)
     */
    @column({ type: "integer", nullable: true })
    number: number | null = null

    @column({ type: "datetime", nullable: true })
    paidAt: Date | null = null

    @column({
        type: "datetime", beforeSave(old?: any) {
            if (old !== undefined) {
                return old;
            }
            const date = new Date()
            date.setMilliseconds(0)
            return date
        }
    })
    createdAt: Date

    @column({
        type: "datetime", beforeSave() {
            const date = new Date()
            date.setMilliseconds(0)
            return date
        }
    })
    updatedAt: Date

    static organization = new ManyToOneRelation(Organization, "organization");
    static payment = new ManyToOneRelation(Payment, "payment");

    async getStructure() {
        let payment: Payment | undefined
        if (this.paymentId) {
            payment = await Payment.getByID(this.paymentId)
        }
        return STInvoiceStruct.create(Object.assign({}, this, {
            payment: payment ? PaymentStruct.create(payment) : null
        }))
    }

    async getPackages(): Promise<STPackage[]> {
        const ids = new Set<string>()

        for (const item of this.meta.items) {
            if (item.package) {
                ids.add(item.package.id)
            }
        }

        if (ids.size > 0) {
            const packages = await STPackage.getByIDs(...ids)

            if (packages.length !== ids.size) {
                console.warn("Invoice contains invalid package ids "+this.id)
            }
            return packages
        }

        console.warn("No connected packages to invoice "+this.id)

        return []
    }

    /**
     * WARNING: only call this in the correct queue!
     */
    async markPaid() {
        // Schule on the queue because we are modifying pending invoices
        if (this.paidAt !== null) {
            return
        }

        this.paidAt = new Date()
        await this.assignNextNumber()

        const packages = await this.getPackages()

        // Increase paid amounts and paid prices
        for (const item of this.meta.items) {
            if (item.package) {
                const pack = packages.find(p => p.id === item.package?.id)

                if (pack) {
                    // Increase paid amount
                    pack.meta.paidPrice += item.price
                    pack.meta.paidAmount += item.amount
                }
            }
        }

        // Search for all packages and activate them if needed (might be possible that they are already validated)
        for (const pack of packages) {
            console.log("Activating package "+pack.id)

            // We'll never have multiple invoices for the same package that are awaiting payments
            pack.meta.lastFailedPayment = null;
            pack.meta.paymentFailedCount = 0;

            await pack.activate()

            // Activate doesn't save always, so save if needed:
            await pack.save()
        }

        // If needed: remove the invoice items from the pending invoice
        if (this.organizationId) {
            const pendingInvoice = await STPendingInvoice.getForOrganization(this.organizationId)
            if (pendingInvoice) {
                // Remove all invoice items that were paid
                const newItems: STInvoiceItem[] = []
                for (const item of pendingInvoice.meta.items) {
                    const found = this.meta.items.find(i => i.id === item.id)
                    if (!found) {
                        newItems.push(item)
                    } else {
                        console.log("Removed invoice item "+item.id+" from pending invoice "+pendingInvoice.id)
                    }
                }
                pendingInvoice.meta.items = newItems

                if (pendingInvoice.invoiceId === this.id) {
                    // Unlock the pending invoice: we allow new invoices to get created
                    pendingInvoice.invoiceId = null
                }
                await pendingInvoice.save()
            }

            // Force regeneration of organization meta data
            await STPackage.updateOrganizationPackages(this.organizationId)
        }
        
        await this.generatePdf()
    }

    async assignNextNumber() {
        return await QueueHandler.schedule("billing/invoice-numbers", async () => {
            // Get clone
            const refreshed = await STInvoice.getByID(this.id)
            if (!refreshed || refreshed.number !== null) {
                return
            }
            if (STInvoice.numberCache) {
                this.number = STInvoice.numberCache + 1
                await this.save()

                // If save succeeded: increase it
                STInvoice.numberCache++;
                return
            }
            const lastInvoice = await STInvoice.where({ number: { value: null, sign: "!=" }}, { sort: [{ column: "number", direction: "DESC"}], limit: 1 })
            STInvoice.numberCache = lastInvoice[0]?.number ?? 0
            
            this.number = STInvoice.numberCache + 1
            await this.save()

            // If save succeeded: increase it
            STInvoice.numberCache++;
            return
        })
    }

    async generatePdf() {
        // todo
    }

    /**
     * WARNGING: only call this method in the correct queue!
     */
    async markFailed() {
        // TODO: add concurrency check to prevent race conditions when polling the status
        // Search for packages and mark failed payment attempt if they are already activated

        for (const pack of await this.getPackages()) {
            pack.meta.lastFailedPayment = new Date()
            pack.meta.paymentFailedCount++;
            await pack.save()
        }

        if (this.organizationId) {
            const pendingInvoice = await STPendingInvoice.getForOrganization(this.organizationId)
            if (pendingInvoice && pendingInvoice.invoiceId === this.id) {
                pendingInvoice.invoiceId = null
                await pendingInvoice.save()
            }

            // Force regeneration of organization meta data
            await STPackage.updateOrganizationPackages(this.organizationId)
        }
    }
}