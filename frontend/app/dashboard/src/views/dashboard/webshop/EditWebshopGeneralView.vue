<template>
    <main class="webshop-view-details">
        <STErrorsDefault :error-box="errorBox" />
        <STInputBox title="Naam (kort)" error-fields="meta.name" :error-box="errorBox">
            <input
                v-model="name"
                class="input"
                type="text"
                placeholder="bv. eetfestijn"
                autocomplete=""
            >
        </STInputBox>

        <hr>
        <h2>Betaalmethodes</h2>

        <p>Zoek je informatie over alle betaalmethodes, neem dan een kijkje op <a class="inline-link" href="https://stamhoofd.be/docs/online-betalen" target="_blank">deze pagina</a>.</p>

        <Checkbox v-model="enableTransfers">
            Overschrijvingen (gratis, maar zelf op te volgen)
        </Checkbox>
        <Checkbox v-model="enablePayconiq">
            Payconiq (20 cent)
        </Checkbox>
        <Checkbox v-model="enableBancontact">
            Bancontact (31 cent)
        </Checkbox>
        <Checkbox v-model="enableIDEAL">
            iDEAL (29 cent)
        </Checkbox>

        <template v-if="enableTransfers">
            <hr>
            <h2>Overschrijvingen</h2>

            <STInputBox title="Begunstigde" error-fields="transferSettings.creditor" :error-box="errorBox">
                <input
                    v-model="creditor"
                    class="input"
                    type="text"
                    :placeholder="organization.meta.transferSettings.creditor || organization.name"
                    autocomplete=""
                >
            </STInputBox>

            <IBANInput v-model="iban" title="Bankrekeningnummer" :placeholder="organization.meta.transferSettings.iban || 'Op deze rekening schrijft men over'" :validator="validator" :required="false" />

            <STInputBox title="Soort mededeling" error-fields="transferSettings.type" :error-box="errorBox" class="max">
                <RadioGroup>
                    <Radio v-for="_type in transferTypes" :key="_type.value" v-model="transferType" :value="_type.value">
                        {{ _type.name }}
                    </Radio>
                </RadioGroup>
            </STInputBox>
            <p class="style-description-small">
                {{ transferTypeDescription }}
            </p>

            <STInputBox v-if="transferType != 'Structured'" :title="transferType == 'Fixed' ? 'Mededeling' : 'Voorvoegsel'" error-fields="transferSettings.prefix" :error-box="errorBox">
                <input
                    v-model="prefix"
                    class="input"
                    type="text"
                    placeholder="bv. Bestelling"
                    autocomplete=""
                >
            </STInputBox>
            <p class="style-description-small">
                Voorbeeld van een mededeling: “{{ transferExample }}”
            </p>
        </template>

        <hr>
        <h2>Beschikbaarheid</h2>

        <Checkbox v-model="useAvailableUntil">
            Stop bestellingen op een bepaalde datum
        </Checkbox>

        <div v-if="useAvailableUntil" class="split-inputs">
            <STInputBox title="Stop bestellingen op" error-fields="settings.availableUntil" :error-box="errorBox">
                <DateSelection v-model="availableUntil" />
            </STInputBox>
            <TimeInput v-model="availableUntil" title="Om" :validator="validator" /> 
        </div>

        <hr>
        <h2>Afhaal- en leveringsopties</h2>

        <STList>
            <STListItem v-for="method in webshop.meta.checkoutMethods" :key="method.id" :selectable="true" @click="editCheckoutMethod(method)">
                {{ method.type == 'Takeout' ? 'Afhalen' : 'Leveren' }}: {{ method.name }}

                <template slot="right">
                    <button class="button icon arrow-up gray" @click.stop="moveCheckoutUp(method)" />
                    <button class="button icon arrow-down gray" @click.stop="moveCheckoutDown(method)" />
                    <span class="icon arrow-right-small gray" />
                </template>
            </STListItem>
        </STList>

        <p>
            <button class="button text" @click="addTakeoutMethod">
                <span class="icon add" />
                <span>Afhaallocatie toevoegen</span>
            </button>
        </p>

        <p>
            <button class="button text" @click="addDeliveryMethod">
                <span class="icon add" />
                <span>Leveringsoptie toevoegen</span>
            </button>
        </p>

        <hr>
        <h2>Open vragen</h2>
        <p>Je kan zelf nog open vragen stellen (bv. 'naam lid') op bestelniveau (je kan dat ook doen per artikel, maar daarvoor moet je het artikel bewerken). Kies dus verstandig of je het bij een artikel ofwel op bestelniveau toevoegt! Op bestelniveau wordt het maar één keer gevraagd voor de volledige bestelling.</p>

        <WebshopFieldsBox :fields="fields" @patch="addFieldsPatch" />

        <div v-if="roles.length > 0" class="container">
            <hr>
            <h2>Toegangsbeheer</h2>
            <p>Kies welke beheerdersgroepen toegang hebben tot deze webshop. Vraag aan de hoofdbeheerders om nieuwe beheerdersgroepen aan te maken indien nodig. Hoofdbeheerders hebben altijd toegang tot alle webshops. Enkel beheerders met 'volledige toegang' kunnen instellingen wijzigen van de webshop.</p>

            <STList>
                <WebshopRolePermissionRow v-for="role in roles" :key="role.id" :role="role" :organization="organization" :webshop="webshop" @patch="addPatch" />
            </STList>
        </div>
    </main>
</template>

<script lang="ts">
import { AutoEncoderPatchType, PatchableArrayAutoEncoder } from '@simonbackx/simple-encoding';
import { ComponentWithProperties,NavigationMixin } from "@simonbackx/vue-app-navigation";
import { Checkbox, DateSelection, ErrorBox, IBANInput,Radio, RadioGroup, STErrorsDefault, STInputBox, STList, STListItem,TimeInput,Toast,TooltipDirective as Tooltip, Validator } from "@stamhoofd/components";
import { SessionManager } from '@stamhoofd/networking';
import { WebshopField } from '@stamhoofd/structures';
import { AnyCheckoutMethod, CheckoutMethod, PaymentMethod, PrivateWebshop, TransferDescriptionType,TransferSettings,WebshopDeliveryMethod, WebshopMetaData, WebshopTakeoutMethod } from '@stamhoofd/structures';
import { Component, Mixins,Prop } from "vue-property-decorator";

import { OrganizationManager } from '../../../classes/OrganizationManager';
import WebshopRolePermissionRow from '../admins/WebshopRolePermissionRow.vue';
import WebshopFieldsBox from './fields/WebshopFieldsBox.vue';
import EditDeliveryMethodView from './locations/EditDeliveryMethodView.vue';
import EditTakeoutMethodView from './locations/EditTakeoutMethodView.vue';

@Component({
    components: {
        STListItem,
        STList,
        STInputBox,
        STErrorsDefault,
        Checkbox,
        IBANInput,
        DateSelection,
        TimeInput,
        RadioGroup,
        Radio,
        WebshopRolePermissionRow,
        WebshopFieldsBox
    },
    directives: { Tooltip },
})
export default class EditWebshopGeneralView extends Mixins(NavigationMixin) {
    @Prop()
    webshop!: PrivateWebshop;

    errorBox: ErrorBox | null = null
    validator = new Validator()

    get name() {
        return this.webshop.meta.name
    }

    set name(name: string) {
        const patch = WebshopMetaData.patch({ name })
        this.$emit("patch", PrivateWebshop.patch({ meta: patch}) )
    }

    get roles() {
        return this.organization.privateMeta?.roles ?? []
    }

    get fields() {
        return this.webshop.meta.customFields
    }

    addFieldsPatch(patch: PatchableArrayAutoEncoder<WebshopField>) {
        this.$emit("patch", PrivateWebshop.patch({
            meta: WebshopMetaData.patch({
                customFields: patch
            })
        }))
    }

    addPatch(patch: AutoEncoderPatchType<PrivateWebshop>) {
        this.$emit("patch", patch)
    }

    addTakeoutMethod() {
        const takeoutMethod = WebshopTakeoutMethod.create({
            address: OrganizationManager.organization.address
        })
       
        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        meta.checkoutMethods.addPut(takeoutMethod)
        p.meta = meta

        this.present(new ComponentWithProperties(EditTakeoutMethodView, { takeoutMethod, webshop: this.webshop.patch(p), saveHandler: (patch: AutoEncoderPatchType<PrivateWebshop>) => {
            // Merge both patches
            this.$emit("patch", p.patch(patch))
        }}).setDisplayStyle("popup"))
    }

    addDeliveryMethod() {
        const deliveryMethod = WebshopDeliveryMethod.create({})
       
        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        meta.checkoutMethods.addPut(deliveryMethod)
        p.meta = meta

        this.present(new ComponentWithProperties(EditDeliveryMethodView, { deliveryMethod, webshop: this.webshop.patch(p), saveHandler: (patch: AutoEncoderPatchType<PrivateWebshop>) => {
            // Merge both patches
            this.$emit("patch", p.patch(patch))
        }}).setDisplayStyle("popup"))
    }

    editCheckoutMethod(checkoutMethod: AnyCheckoutMethod) {
        if (checkoutMethod instanceof WebshopTakeoutMethod) {
            this.present(new ComponentWithProperties(EditTakeoutMethodView, { takeoutMethod: checkoutMethod, webshop: this.webshop, saveHandler: (patch: AutoEncoderPatchType<PrivateWebshop>) => {
                // Merge both patches
                this.$emit("patch", patch)
            }}).setDisplayStyle("popup"))
        } else {
            this.present(new ComponentWithProperties(EditDeliveryMethodView, { deliveryMethod: checkoutMethod, webshop: this.webshop, saveHandler: (patch: AutoEncoderPatchType<PrivateWebshop>) => {
                // Merge both patches
                this.$emit("patch", patch)
            }}).setDisplayStyle("popup"))
        }
    }

    moveCheckoutUp(location: CheckoutMethod) {
        const index = this.webshop.meta.checkoutMethods.findIndex(c => location.id === c.id)
        if (index == -1 || index == 0) {
            return;
        }

        const moveTo = index - 2
        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        meta.checkoutMethods.addMove(location.id, this.webshop.meta.checkoutMethods[moveTo]?.id ?? null)
        p.meta = meta
        this.$emit("patch", p)
    }

    moveCheckoutDown(location: CheckoutMethod) {
        const index = this.webshop.meta.checkoutMethods.findIndex(c => location.id === c.id)
        if (index == -1 || index >= this.webshop.meta.checkoutMethods.length - 1) {
            return;
        }

        const moveTo = index + 1
        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        meta.checkoutMethods.addMove(location.id,this.webshop.meta.checkoutMethods[moveTo].id)
        p.meta = meta
        this.$emit("patch", p)
    }

    get organization() {
        return SessionManager.currentSession!.organization!
    }

    get useAvailableUntil() {
        return this.webshop.meta.availableUntil !== null
    }

    set useAvailableUntil(use: boolean) {
        if (use == this.useAvailableUntil) {
            return;
        }
        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        if (use) {
            meta.availableUntil = new Date()
        } else {
            meta.availableUntil = null
        }
        p.meta = meta
        this.$emit("patch", p)
    }

    get availableUntil() {
        return this.webshop.meta.availableUntil ?? new Date()
    }

    set availableUntil(availableUntil: Date) {
        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        meta.availableUntil = availableUntil
        p.meta = meta
        this.$emit("patch", p)
    }

    get transferTypes() {
        return [
            { 
                value: TransferDescriptionType.Structured,
                name: "Gestructureerde mededeling",
                description: "Geen kans op typefouten vanwege validatie in bankapps"
            },
            { 
                value: TransferDescriptionType.Reference,
                name: "Bestelnummer",
                description: "Eventueel voorafgegaan door een zelf gekozen woord (zie onder)"
            },
            { 
                value: TransferDescriptionType.Fixed,
                name: "Vaste mededeling",
                description: "Altijd dezelfde mededeling voor alle bestellingen"
            }
        ]
    }

    get transferTypeDescription() {
        return this.transferTypes.find(t => t.value === this.transferType)?.description ?? ""
    }

    get creditor() {
        return this.webshop.meta.transferSettings.creditor
    }

    set creditor(creditor: string | null ) {
        const p = PrivateWebshop.patch({})
        p.meta = WebshopMetaData.patch({ 
            transferSettings: TransferSettings.patch({
                creditor: !creditor || creditor.length == 0 || creditor == (this.organization.meta.transferSettings.creditor ?? this.organization.name) ? null : creditor
            })
        })
        this.$emit("patch", p)
    }

    get iban() {
        return this.webshop.meta.transferSettings.iban
    }

    set iban(iban: string | null ) {
        const p = PrivateWebshop.patch({})
        p.meta = WebshopMetaData.patch({ 
            transferSettings: TransferSettings.patch({
                iban: !iban || iban.length == 0 || iban == this.organization.meta.transferSettings.iban ? null : iban
            })
        })
        this.$emit("patch", p)
    }

    get prefix() {
        return this.webshop.meta.transferSettings.prefix
    }

    set prefix(prefix: string | null ) {
        const p = PrivateWebshop.patch({})
        p.meta = WebshopMetaData.patch({ 
            transferSettings: TransferSettings.patch({
                prefix
            })
        })
        this.$emit("patch", p)
    }

    get transferType() {
        return this.webshop.meta.transferSettings.type
    }

    set transferType(type: TransferDescriptionType ) {
        const p = PrivateWebshop.patch({})
        p.meta = WebshopMetaData.patch({ 
            transferSettings: TransferSettings.patch({
                type
            })
        })
        this.$emit("patch", p)
    }

    get transferExample() {
        if (this.transferType == TransferDescriptionType.Structured) {
            return "+++705/1929/77391+++"
        }

        if (this.transferType == TransferDescriptionType.Reference) {
            return (this.prefix ? this.prefix+' ' : '') + "152"
        }

        return this.prefix
    }

    get enableTransfers() {
        return this.webshop.meta.paymentMethods.includes(PaymentMethod.Transfer)
    }

    set enableTransfers(enable: boolean) {
        if (enable == this.enableTransfers) {
            return;
        }

        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        p.meta = meta

        if (enable) {
            meta.paymentMethods.addPut(PaymentMethod.Transfer)
        } else {
            if (this.webshop.meta.paymentMethods.length == 1) {
                new Toast("Je moet minimaal één betaalmethode accepteren", "error red").show();
                return
            }
            meta.paymentMethods.addDelete(PaymentMethod.Transfer) 
        }

        this.$emit("patch", p)
    }

    get enablePayconiq() {
        return this.webshop.meta.paymentMethods.includes(PaymentMethod.Payconiq)
    }

    set enablePayconiq(enable: boolean) {
        if (enable == this.enablePayconiq) {
            return;
        }

        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        p.meta = meta

        if (enable) {
            if ((this.organization.privateMeta?.payconiqApiKey ?? "").length == 0) {
                new Toast("Om Payconiq te activeren moet je eerst een API-key invullen bij de instellingen van je vereniging (links in het menu). Stuur ons zeker een mailtje via hallo@stamhoofd.be bij vragen in afwachting van onze documentatie.", "error red").setHide(15000).show();
                return;
            }
            meta.paymentMethods.addPut(PaymentMethod.Payconiq)
        } else {
            if (this.organization.meta.paymentMethods.length == 1) {
                new Toast("Je moet minimaal één betaalmethode accepteren", "error red").show();
                return
            }

            meta.paymentMethods.addDelete(PaymentMethod.Payconiq) 
        }

        this.$emit("patch", p)
    }
    
    get enableBancontact() {
        return this.webshop.meta.paymentMethods.includes(PaymentMethod.Bancontact)
    }

    set enableBancontact(enable: boolean) {
        if (enable == this.enableBancontact) {
            return;
        }

        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        p.meta = meta

        if (enable) {
            if (!this.organization.privateMeta?.mollieOnboarding || !this.organization.privateMeta.mollieOnboarding.canReceivePayments) {
                new Toast("Je kan Bancontact niet activeren, daarvoor moet je eerst online betalingen activeren bij instellingen. Daarna kan je Bancontact betalingen accepteren.", "error red").show();
                return
            }
            meta.paymentMethods.addPut(PaymentMethod.Bancontact)
        } else {
            if (this.webshop.meta.paymentMethods.length == 1) {
                new Toast("Je moet minimaal één betaalmethode accepteren", "error red").show();
                return
            }

            meta.paymentMethods.addDelete(PaymentMethod.Bancontact) 
        }

        this.$emit("patch", p)
    }

    get enableIDEAL() {
        return this.webshop.meta.paymentMethods.includes(PaymentMethod.iDEAL)
    }

    set enableIDEAL(enable: boolean) {
        if (enable == this.enableIDEAL) {
            return;
        }

        const p = PrivateWebshop.patch({})
        const meta = WebshopMetaData.patch({})
        p.meta = meta

        if (enable) {
            if (!this.organization.privateMeta?.mollieOnboarding || !this.organization.privateMeta.mollieOnboarding.canReceivePayments) {
                new Toast("Je kan iDEAL niet activeren, daarvoor moet je eerst online betalingen activeren bij instellingen. Daarna kan je iDEAL betalingen accepteren.", "error red").show();
                return
            }
            meta.paymentMethods.addPut(PaymentMethod.iDEAL)
        } else {
            if (this.webshop.meta.paymentMethods.length == 1) {
                new Toast("Je moet minimaal één betaalmethode accepteren", "error red").show();
                return
            }

            meta.paymentMethods.addDelete(PaymentMethod.iDEAL) 
        }

        this.$emit("patch", p)
    }


  
}
</script>

<style lang="scss">
@use "@stamhoofd/scss/base/variables.scss" as *;
@use '@stamhoofd/scss/base/text-styles.scss';

</style>
