<template>
    <div id="records-settings-view" class="st-view background">
        <STNavigationBar title="Wijzig gevraagde gegevens">
            <BackButton v-if="canPop" slot="left" @click="pop" />
            <button v-else slot="right" class="button icon close gray" @click="pop" />
        </STNavigationBar>

        <main>
            <h1>
                Wijzig gevraagde gegevens
            </h1>
            <p>Je kan hieronder kiezen welke vragen of keuzes jouw leden te zien krijgen bij het inschrijven. Voorlopig is het nog niet mogelijk om zelf vragen toe te voegen, contacteer ons gerust op hallo@stamhoofd.be als je ideeën hebt voor vragen.</p>

            <p class="info-box">
                Om in orde te zijn met de GDPR-wetgeving moet je kunnen verantwoorden waarom je elk van deze gegevens vraagt. Selecteer dus enkel wat voor jullie van toepassing is.
            </p>
            
            <STErrorsDefault :error-box="errorBox" />

            <hr>
            <h2>Privacy</h2>

            <Checkbox :checked="getBooleanType(RecordType.DataPermissions) || dataRequired" :disabled="dataRequired" class="long-text" @change="setBooleanType(RecordType.DataPermissions, $event)">
                Vraag toestemming voor het verzamelen van <a class="inline-link" target="_blank" rel="noopener noreferrer" href="https://www.gegevensbeschermingsautoriteit.be/professioneel/thema-s/gevoelige-gegevens">gevoelige gegevens</a>
                <p v-if="dataRequired" class="style-description-small">
                    Dit kan je enkel uitschakelen als je verder geen gevoelige gegevens in Stamhoofd zelf vraagt.
                </p>
                <p v-else class="style-description-small">
                    Vink dit aan als je buiten Stamhoofd gevoelige gegevens verzamelt of als het lidmaatschap zelf als gevoelig kan worden beschouwd. Bij twijfel altijd aangevinkt houden.
                </p>
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.PicturePermissions)" class="long-text" @change="setBooleanType(RecordType.PicturePermissions, $event)">
                Vraag toestemming voor publicatie van foto's op de website en sociale media
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.GroupPicturePermissions)" class="long-text" @change="setBooleanType(RecordType.GroupPicturePermissions, $event)">
                Vraag toestemming voor publicatie van <strong>groeps</strong>foto's op de website en sociale media
                <p v-if="getBooleanType(RecordType.PicturePermissions)" class="style-description-small">
                    Als er geen toestemming werd gegeven voor de publicatie van foto's (hierboven)
                </p>
            </Checkbox>

            <Checkbox v-model="financialProblems">
                Vraag of het gezin financiële moeilijkheden heeft (kansarm gezin)
                <p class="style-description-small">
                    Je moet dit zeker vragen als je verminderd lidgeld hebt ingesteld. Of vink dit aan als je deze informatie nodig hebt voor andere zaken (bv. voor het uitdelen van tweedehands materiaal).
                </p>
            </Checkbox>

            <hr>
            <h2>Vrije bijdrage</h2>

            <p>
                Je kan bij het inschrijven de mogelijkheid geven om ook een vrije bijdrage (gift) te doen. We tonen dan drie opties waaruit ze kunnen kiezen, waarbij ze ook altijd zelf een bedrag kunnen ingeven. Je kan hieronder de drie standaard bedragen aanpassen. <a class="inline-link" href="https://stamhoofd.be/docs/vrije-bijdrage" target="_blank">Meer info</a>.
            </p>

            <Checkbox v-model="freeContribution">
                Vraag een vrije bijdrage bij het inschrijven (optioneel)
                <p v-if="financialProblems" class="style-description-small">
                    We slaan deze stap altijd over bij kansarme gezinnen
                </p>
            </Checkbox>

            <div v-if="freeContribution" class="free-contribution-box">
                <STInputBox title="Beschrijving" class="max">
                    <textarea v-model="freeContributionDescription" class="input" placeholder="Beschrijving bovenaan (bv. verduidelijking waarom je vrije bijdrage vraagt en wat je ermee gaat doen)" />
                </STInputBox>

                <STInputBox title="Standaard opties">
                    <PriceInput :value="getFreeContributionAmounts(0)" placeholder="Optie 1" @input="setFreeContributionAmounts(0, $event)" />
                    <PriceInput :value="getFreeContributionAmounts(1)" placeholder="Optie 2" @input="setFreeContributionAmounts(1, $event)" />
                    <PriceInput :value="getFreeContributionAmounts(2)" placeholder="Optie 3" @input="setFreeContributionAmounts(2, $event)" />
                </STInputBox>
            </div>

            <hr>
            <h2>Allergieën</h2>

            <Checkbox :checked="getBooleanType(RecordType.FoodAllergies)" @change="setBooleanType(RecordType.FoodAllergies, $event)">
                Allergisch of overgevoelig voor bepaalde voeding
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.MedicineAllergies)" @change="setBooleanType(RecordType.MedicineAllergies, $event)">
                Allergisch voor geneesmiddelen
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.HayFever)" @change="setBooleanType(RecordType.HayFever, $event)">
                Hooikoorts
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.OtherAllergies)" @change="setBooleanType(RecordType.OtherAllergies, $event)">
                Allergisch voor andere zaken (verf, insecten...)
            </Checkbox>

            <hr>
            <h2>Dieet</h2>

            <Checkbox :checked="getBooleanType(RecordType.Vegetarian)" @change="setBooleanType(RecordType.Vegetarian, $event)">
                Vegetarisch dieet
            </Checkbox>
            <Checkbox :checked="getBooleanType(RecordType.Vegan)" @change="setBooleanType(RecordType.Vegan, $event)">
                Veganistisch dieet (geen dierlijke producten)
            </Checkbox>
            <Checkbox :checked="getBooleanType(RecordType.Halal)" @change="setBooleanType(RecordType.Halal, $event)">
                Halal dieet
            </Checkbox>
            <Checkbox :checked="getBooleanType(RecordType.Kosher)" @change="setBooleanType(RecordType.Kosher, $event)">
                Koosjer dieet
            </Checkbox>
            <Checkbox :checked="getBooleanType(RecordType.Diet)" @change="setBooleanType(RecordType.Diet, $event)">
                Ander dieet (geen allergieën)
            </Checkbox>

            <hr>
            <h2>Gezondheid, hygiëne &amp; slapen</h2>

            <Checkbox :checked="getBooleanType(RecordType.CovidHighRisk)" @change="setBooleanType(RecordType.CovidHighRisk, $event)">
                Hoge risicogroep voor coronavirus
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.TetanusVaccine)" @change="setBooleanType(RecordType.TetanusVaccine, $event)">
                Tetanusvaccinatie
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.Asthma)" @change="setBooleanType(RecordType.Asthma, $event)">
                Astma
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.BedWaters)" @change="setBooleanType(RecordType.BedWaters, $event)">
                Bedwateren
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.Epilepsy)" @change="setBooleanType(RecordType.Epilepsy, $event)">
                Epilepsie
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.HeartDisease)" @change="setBooleanType(RecordType.HeartDisease, $event)">
                Hartkwaal
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.SkinCondition)" @change="setBooleanType(RecordType.SkinCondition, $event)">
                Huidaandoening
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.Rheumatism)" @change="setBooleanType(RecordType.Rheumatism, $event)">
                Reuma
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.SleepWalking)" @change="setBooleanType(RecordType.SleepWalking, $event)">
                Slaapwandelen
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.Diabetes)" @change="setBooleanType(RecordType.Diabetes, $event)">
                Suikerziekte
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.Medicines)" @change="setBooleanType(RecordType.Medicines, $event)">
                Moet geneesmiddelen nemen (dagelijks, wekelijks...)
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.SpecialHealthCare)" @change="setBooleanType(RecordType.SpecialHealthCare, $event)">
                Er is bijzondere aandacht nodig om risico's te voorkomen + welke
            </Checkbox>

            <hr>
            <h2>Sport, spel en sociale omgang</h2>

            <Checkbox :checked="getBooleanType(RecordType.CanNotSwim)" @change="setBooleanType(RecordType.CanNotSwim, $event)">
                Kan niet (of onvoldoende) zwemmen
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.TiredQuickly)" @change="setBooleanType(RecordType.TiredQuickly, $event)">
                Vlug moe
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.CanNotParticipateInSport)" @change="setBooleanType(RecordType.CanNotParticipateInSport, $event)">
                Kan niet deelnemen aan sport en spel afgestemd op hun leeftijd
            </Checkbox>

            <Checkbox :checked="getBooleanType(RecordType.SpecialSocialCare)" @change="setBooleanType(RecordType.SpecialSocialCare, $event)">
                Er is bijzondere aandacht nodig bij sociale omgang
            </Checkbox>

            <hr>
            <h2>Toedienen van medicatie</h2>

            <p class="style-description">
                Het is verboden om als begeleid(st)er, behalve EHBO, op eigen initiatief medische handelingen uit te voeren. Ook het verstrekken van lichte pijnstillende en koortswerende medicatie zoals Perdolan, Dafalgan of Aspirine is, zonder toelating van de ouders, voorbehouden aan een arts. Daarom is het noodzakelijk om via deze steekkaart vooraf toestemming van ouders te hebben voor het eventueel toedienen van dergelijke hulp.
            </p>

            <Checkbox :checked="getBooleanType(RecordType.MedicinePermissions)" @change="setBooleanType(RecordType.MedicinePermissions, $event)">
                Vraag toestemming voor het toedienen van medicatie (wordt enkel gevraagd voor minderjarigen)*
            </Checkbox>

            <p class="style-description-small">
                * gebaseerd op aanbeveling Kind & Gezin 09.12.2009 – Aanpak van koorts / Toedienen van geneesmiddelen in de kinderopvang
            </p>

            <hr>
            <h2>Andere inlichtingen</h2>

            <Checkbox :checked="getBooleanType(RecordType.Other)" @change="setBooleanType(RecordType.Other, $event)">
                Vrij veld voor andere opmerkingen
            </Checkbox>

            <hr>
            <h2>Contactgegevens vragen van...</h2>

            <STInputBox title="Huisdokter" class="max">
                <RadioGroup>
                    <Radio v-model="doctor" :value="AskRequirement.NotAsked">
                        Niet vragen
                    </Radio>
                    <Radio v-model="doctor" :value="AskRequirement.Optional">
                        Optioneel
                    </Radio>
                    <Radio v-model="doctor" :value="AskRequirement.Required">
                        Verplicht
                    </Radio>
                </RadioGroup>
            </STInputBox>

            <STInputBox title="Noodcontactpersoon" class="max">
                <RadioGroup>
                    <Radio v-model="emergencyContact" :value="AskRequirement.NotAsked">
                        Niet vragen
                    </Radio>
                    <Radio v-model="emergencyContact" :value="AskRequirement.Optional">
                        Optioneel
                    </Radio>
                    <Radio v-model="emergencyContact" :value="AskRequirement.Required">
                        Verplicht
                    </Radio>
                </RadioGroup>
            </STInputBox>
        </main>

        <STToolbar>
            <template slot="right">
                <LoadingButton :loading="saving">
                    <button class="button primary" @click="save">
                        Opslaan
                    </button>
                </LoadingButton>
            </template>
        </STToolbar>
    </div>
</template>

<script lang="ts">
import { AutoEncoder, AutoEncoderPatchType, PatchableArray, patchContainsChanges } from '@simonbackx/simple-encoding';
import { SimpleErrors } from '@simonbackx/simple-errors';
import { HistoryManager, NavigationMixin } from "@simonbackx/vue-app-navigation";
import { BackButton, CenteredMessage, Checkbox, ErrorBox, LoadingButton, PriceInput,Radio, RadioGroup, STErrorsDefault,STInputBox, STNavigationBar, STToolbar, Toast, Validator } from "@stamhoofd/components";
import { FreeContributionSettings } from '@stamhoofd/structures';
import { AskRequirement, Organization, OrganizationMetaData, OrganizationPatch, OrganizationRecordsConfiguration, RecordType, Version } from "@stamhoofd/structures"
import { Component, Mixins } from "vue-property-decorator";

import { OrganizationManager } from "../../../../../classes/OrganizationManager"

@Component({
    components: {
        STNavigationBar,
        STToolbar,
        STInputBox,
        STErrorsDefault,
        Checkbox,
        RadioGroup,
        Radio,
        BackButton,
        LoadingButton,
        PriceInput
    },
})
export default class RecordsSettingsView extends Mixins(NavigationMixin) {
    errorBox: ErrorBox | null = null
    validator = new Validator()
    saving = false
    temp_organization = OrganizationManager.organization

    organizationPatch: AutoEncoderPatchType<Organization> & AutoEncoder = OrganizationPatch.create({ id: OrganizationManager.organization.id })

    get organization() {
        return OrganizationManager.organization.patch(this.organizationPatch)
    }

    get doctor() {
        return this.organization.meta.recordsConfiguration.doctor
    }

    set doctor(val: AskRequirement) {
        if (!this.organizationPatch.meta) {
            // Need to use vue methods to keep it reactive
            this.$set(this.organizationPatch, 'meta', OrganizationMetaData.patch({
                recordsConfiguration: OrganizationRecordsConfiguration.patch({})
            }))
            this.organizationPatch.meta = this.organizationPatch.meta!
        }

        if (!this.organizationPatch.meta.recordsConfiguration) {
            return
        }

        this.$set(this.organizationPatch.meta.recordsConfiguration, 'doctor', val)
    }

    get emergencyContact() {
        return this.organization.meta.recordsConfiguration.emergencyContact
    }

    set emergencyContact(val: AskRequirement) {
        if (!this.organizationPatch.meta) {
            // Need to use vue methods to keep it reactive
            this.$set(this.organizationPatch, 'meta', OrganizationMetaData.patch({
                recordsConfiguration: OrganizationRecordsConfiguration.patch({})
            }))
            this.organizationPatch.meta = this.organizationPatch.meta!
        }

        if (!this.organizationPatch.meta.recordsConfiguration) {
            return
        }

        this.$set(this.organizationPatch.meta.recordsConfiguration, 'emergencyContact', val)
    }

    get financialProblems() {
        return this.getBooleanType(RecordType.FinancialProblems)
    }

    set financialProblems(enabled: boolean) {
        const hasReduced = !!this.organization.groups.find(g => {
            return !!g.settings.prices.find(p => !!p.prices.find(gg => gg.reducedPrice !== null))
        })
        if (hasReduced && !enabled) {
            new Toast("Eén of meerdere leeftijdsgroepen maken gebruik van verminderd lidgeld. Schakel dat eerst overal uit.", "error red").show()
            return
        }
        this.setBooleanType(RecordType.FinancialProblems, enabled)
    }

    get freeContribution() {
        return this.organization.meta.recordsConfiguration.freeContribution !== null
    }

    set freeContribution(enable: boolean) {
        if (enable === this.freeContribution) {
            return
        }

        if (enable) {
            this.organizationPatch = this.organizationPatch.patch({
                meta: OrganizationMetaData.patch({
                    recordsConfiguration: OrganizationRecordsConfiguration.patch({
                        freeContribution: FreeContributionSettings.create({})
                    })
                })
            })
        } else {
            this.organizationPatch = this.organizationPatch.patch({
                meta: OrganizationMetaData.patch({
                    recordsConfiguration: OrganizationRecordsConfiguration.patch({
                        freeContribution: null
                    })
                })
            })
        }
    }

    getFreeContributionAmounts(index: number ) {
        return this.organization.meta.recordsConfiguration.freeContribution?.amounts[index] ?? 0
    }

    setFreeContributionAmounts(index: number, amount: number) {
        const amounts = this.organization.meta.recordsConfiguration.freeContribution?.amounts ?? []
        const p = FreeContributionSettings.patch({})
        for (const a of amounts) (
            p.amounts.addDelete(a)
        )
        amounts[index] = amount
        for (const a of amounts) (
            p.amounts.addPut(a)
        )
        this.organizationPatch = this.organizationPatch.patch({
            meta: OrganizationMetaData.patch({
                recordsConfiguration: OrganizationRecordsConfiguration.patch({
                    freeContribution: p
                })
            })
        })
    }

    get freeContributionDescription() {
        return this.organization.meta.recordsConfiguration.freeContribution?.description ?? ""
    }

    set freeContributionDescription(description: string) {
        this.organizationPatch = this.organizationPatch.patch({
            meta: OrganizationMetaData.patch({
                recordsConfiguration: OrganizationRecordsConfiguration.patch({
                    freeContribution: FreeContributionSettings.patch({
                        description
                    })
                })
            })
        })
    }

    async save() {
        if (this.saving) {
            return;
        }

        const errors = new SimpleErrors()
      
        let valid = false

        if (errors.errors.length > 0) {
            this.errorBox = new ErrorBox(errors)
        } else {
            this.errorBox = null
            valid = true
        }
        valid = valid && await this.validator.validate()

        if (!valid) {
            return;
        }

        this.saving = true

        try {
            await OrganizationManager.patch(this.organizationPatch)
            this.organizationPatch = OrganizationPatch.create({ id: OrganizationManager.organization.id })
            new Toast('De wijzigingen zijn opgeslagen', "success green").show()
            this.dismiss({ force: true })
        } catch (e) {
            this.errorBox = new ErrorBox(e)
        }

        this.saving = false
    }

    async shouldNavigateAway() {
        if (!patchContainsChanges(this.organizationPatch, OrganizationManager.organization, { version: Version })) {
            return true;
        }
        return await CenteredMessage.confirm("Ben je zeker dat je wilt sluiten zonder op te slaan?", "Niet opslaan")
    }

    get RecordType() {
        return RecordType
    }

    get AskRequirement() {
        return AskRequirement
    }

    get dataRequired() {
        return this.organization.meta.recordsConfiguration.needsData()
    }

    // Helpers ---

    getBooleanType(type: RecordType) {
        return !!this.organization.meta.recordsConfiguration.enabledRecords.find(r => r == type)
    }

    setBooleanType(type: RecordType, enabled: boolean) {
        const index = this.organization.meta.recordsConfiguration.enabledRecords.findIndex(r => r == type)
        if ((index != -1) === enabled) {
            return
        }

        if (!this.organizationPatch.meta) {
            // Need to use vue methods to keep it reactive
            this.$set(this.organizationPatch, 'meta', OrganizationMetaData.patch({
                recordsConfiguration: OrganizationRecordsConfiguration.patch({})
            }))
            this.organizationPatch.meta = this.organizationPatch.meta!
        }

        if (!this.organizationPatch.meta.recordsConfiguration) {
            return
        }

        if (!(this.organizationPatch.meta.recordsConfiguration.enabledRecords instanceof PatchableArray)) {
            return
        }        
        
        if (enabled) {
            this.organizationPatch.meta.recordsConfiguration.enabledRecords.addPut(type)
        } else {
            this.organizationPatch.meta.recordsConfiguration.enabledRecords.addDelete(type)
        }
    }
   
    mounted() {
        HistoryManager.setUrl("/settings/records");
    }
}
</script>
