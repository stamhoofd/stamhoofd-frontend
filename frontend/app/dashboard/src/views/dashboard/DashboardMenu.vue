<template>
    <div class="st-menu">
        <div class="padding-group">
            <Logo />
            <button id="organization-switcher" @click="switchOrganization">
                <span class="text">{{ organization.name }}</span>
            </button>

            <input v-if="false" class="input search" placeholder="Zoeken">
        </div>

        <a v-if="false" class="menu-button button heading" href="https://docs.stamhoofd.be" target="_blank">
            <span class="icon info-filled" />
            <span>Documentatie</span>
        </a>

        <a v-if="enableMemberModule" class="menu-button button heading" :href="registerUrl" target="_blank">
            <span class="icon external" />
            <span>Jouw inschrijvingspagina</span>
        </a>

        <button v-if="whatsNewBadge" class="menu-button button heading" @click="manageWhatsNew()">
            <span class="icon gift" />
            <span>Wat is er nieuw?</span>
            <span v-if="whatsNewBadge" class="bubble">{{ whatsNewBadge }}</span>
        </button>

        <button v-if="fullAccess && organization.privateMeta.requestKeysCount > 0" class="menu-button button heading" :class="{ selected: currentlySelected == 'keys' }" @click="manageKeys()">
            <span class="icon key" />
            <span>Gebruikers goedkeuren</span>
            <span class="bubble">{{ organization.privateMeta.requestKeysCount }}</span>
        </button>

        <hr v-if="whatsNewBadge || enableMemberModule || (fullAccess && organization.privateMeta.requestKeysCount > 0)">

        <template v-if="enableMemberModule">
            <div v-for="category in tree.categories">
                <div>
                    <button class="menu-button button heading" :class="{ selected: currentlySelected == 'category-'+category.id }" @click="openCategory(category)">
                        <span class="icon group" />
                        <span>{{ category.settings.name }}</span>
                        <span v-if="isCategoryDeactivated(category)" v-tooltip="'Deze categorie is onzichtbaar voor leden omdat activiteiten niet geactiveerd is'" class="icon error red right-icon" />
                    </button>

                    <button
                        v-for="group in category.groups"
                        :key="group.id"
                        class="menu-button button"
                        :class="{ selected: currentlySelected == 'group-'+group.id }"
                        @click="openGroup(group)"
                    >
                        <span>{{ group.settings.name }}</span>
                    </button>

                    <button
                        v-for="c in category.categories"
                        :key="c.id"
                        class="menu-button button"
                        :class="{ selected: currentlySelected == 'category-'+c.id }"
                        @click="openCategory(c)"
                    >
                        <span>{{ c.settings.name }}</span>
                    </button>
                </div>
                <hr>
            </div>
        </template>
    

        <div v-if="enableWebshopModule && (canCreateWebshops || webshops.length > 0)">
            <button class="menu-button heading">
                <span class="icon basket" />
                <span>Verkopen</span>
                <button v-if="canCreateWebshops" class="button text" @click="addWebshop()">
                    <span class="icon add" />
                    <span>Nieuw</span>
                </button>
            </button>

            <button
                v-for="webshop in webshops"
                :key="webshop.id"
                class="menu-button button"
                :class="{ selected: currentlySelected == 'webshop-'+webshop.id }"
                @click="openWebshop(webshop)"
            >
                {{ webshop.meta.name }}
            </button>
        </div>
        <hr v-if="enableWebshopModule && (canCreateWebshops || webshops.length > 0)">

        <button v-if="canManagePayments" class="menu-button button heading" :class="{ selected: currentlySelected == 'manage-payments'}" @click="managePayments(true)"> 
            <span class="icon card" />
            <span>Overschrijvingen</span>
        </button>

        <div v-if="fullAccess">
            <button class="menu-button button heading" :class="{ selected: currentlySelected == 'manage-settings'}" @click="manageSettings(true)">
                <span class="icon settings" />
                <span>Instellingen</span>
            </button>

            <button v-if="isSGV" class="menu-button button heading" :class="{ selected: currentlySelected == 'manage-sgv-groepsadministratie'}" @click="openSyncScoutsEnGidsen(true)">
                <span class="icon sync" />
                <span>Groepsadministratie</span>
            </button>
        </div>
        <hr v-if="fullAccess || canManagePayments">
        <div class="">
            <button class="menu-button button heading" :class="{ selected: currentlySelected == 'manage-account'}" @click="manageAccount(true)">
                <span class="icon user" />
                <span>Mijn account</span>
            </button>
            <button class="menu-button button heading" @click="logout">
                <span class="icon logout" />
                <span>Uitloggen</span>
            </button>
        </div>
    </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ComponentWithProperties, HistoryManager } from "@simonbackx/vue-app-navigation";
import { NavigationMixin } from "@simonbackx/vue-app-navigation";
import { NavigationController } from "@simonbackx/vue-app-navigation";
import { CenteredMessage, Logo, Toast, ToastButton, TooltipDirective } from '@stamhoofd/components';
import { Sodium } from "@stamhoofd/crypto";
import { Keychain, LoginHelper,SessionManager } from '@stamhoofd/networking';
import { Group, GroupCategory, GroupCategoryTree, OrganizationType, Permissions, UmbrellaOrganization, WebshopPreview } from '@stamhoofd/structures';
import { Formatter } from "@stamhoofd/utility";
import { Component, Mixins } from "vue-property-decorator";

import { MemberManager } from "../../classes/MemberManager";
import { OrganizationManager } from '../../classes/OrganizationManager';
import { WhatsNewCount } from '../../classes/WhatsNewCount';
import SignupModulesView from "../signup/SignupModulesView.vue";
import AccountSettingsView from './account/AccountSettingsView.vue';
import CategoryView from "./groups/CategoryView.vue";
import GroupMembersView from "./groups/GroupMembersView.vue";
import KeysView from "./keys/KeysView.vue";
import NoKeyView from './NoKeyView.vue';
import PaymentsView from './payments/PaymentsView.vue';
import SettingsView from './settings/SettingsView.vue';
import SGVGroepsadministratieView from './settings/SGVGroepsadministratieView.vue';
import EditWebshopView from './webshop/EditWebshopView.vue';
import WebshopView from './webshop/WebshopView.vue';

@Component({
    components: {
        Logo
    },
    directives: {
        tooltip: TooltipDirective
    }
})
export default class Menu extends Mixins(NavigationMixin) {
    SessionManager = SessionManager // needed to make session reactive
    currentlySelected: string | null = null
    whatsNewBadge = ""

    get organization() {
        return OrganizationManager.organization
    }
    
    get registerUrl() {
        if (this.organization.registerDomain) {
            return "https://"+this.organization.registerDomain
        } 

        return "https://"+this.organization.uri+'.'+process.env.HOSTNAME_REGISTRATION
    }

    get isSGV() {
        return this.organization.meta.type == OrganizationType.Youth && this.organization.meta.umbrellaOrganization == UmbrellaOrganization.ScoutsEnGidsenVlaanderen
    }

    get tree() {
        return this.organization.categoryTreeForPermissions(OrganizationManager.user.permissions ?? Permissions.create({}))
    }

    mounted() {
        const path = window.location.pathname;
        const parts = path.substring(1).split("/");
        let didSet = false

        if ((parts.length >= 1 && parts[0] == 'settings') || (parts.length == 2 && parts[0] == 'oauth' && parts[1] == 'mollie')) {
            if (this.fullAccess) {
                this.manageSettings(false)
                didSet = true
            }
        }

        if (parts.length >= 1 && parts[0] == 'transfers') {
            if (this.canManagePayments) {
                this.managePayments(false)
                didSet = true
            }
        }

        if (parts.length >= 1 && parts[0] == 'account') {
            this.manageAccount(false)
            didSet = true
        }

        if ((parts.length >= 1 && parts[0] == 'scouts-en-gidsen-vlaanderen') || (parts.length == 2 && parts[0] == 'oauth' && parts[1] == 'sgv')) {
            if (this.fullAccess) {
                this.openSyncScoutsEnGidsen(false)
                didSet = true
            }
        }

        if (!didSet && this.enableMemberModule && parts.length >= 2 && parts[0] == "category") {
            for (const category of this.organization.meta.categories) {
                if (parts[1] == Formatter.slug(category.settings.name)) {
                    if (parts[2] && parts[2] == "all") {
                        this.openCategoryMembers(category, false)
                    } else {
                        this.openCategory(category, false)
                    }
                    didSet = true
                    break;
                }
            }
        }

        if (!didSet && this.enableMemberModule && parts.length >= 2 && parts[0] == "groups") {
            for (const group of this.organization.groups) {
                if (parts[1] == Formatter.slug(group.settings.name)) {
                    this.openGroup(group, false)
                    didSet = true
                    break;
                }
            }
        }

        if (!didSet && this.enableWebshopModule && parts.length >= 2 && parts[0] == "webshops") {
            for (const webshop of this.organization.webshops) {
                if (parts[1] == Formatter.slug(webshop.meta.name)) {
                    this.openWebshop(webshop, false)
                    didSet = true
                    break;
                }
            }
        }

        if (!didSet) {
            HistoryManager.setUrl("/")
        }
        
        if (!didSet && !this.splitViewController?.shouldCollapse()) {
            //if (this.groups.length > 0) {
                //this.openGroup(this.groups[0], false)
            //} else {
                if (this.fullAccess) {
                    this.manageSettings(false)
                } else {
                    this.manageAccount(false)
                }
            //}
        }

        document.title = "Stamhoofd - "+OrganizationManager.organization.name

        this.checkKey().catch(e => {
            console.error(e)
        })

        const currentCount = localStorage.getItem("what-is-new")
        if (currentCount) {
            const c = parseInt(currentCount)
            if (!isNaN(c) && WhatsNewCount - c > 0) {
                this.whatsNewBadge = (WhatsNewCount - c).toString()
            }
        } else {
            localStorage.setItem("what-is-new", (WhatsNewCount as any).toString());
        }

        if (!didSet) {
            if (!this.organization.meta.modules.useMembers && !this.organization.meta.modules.useWebshops) {
                this.present(new ComponentWithProperties(SignupModulesView, { }).setDisplayStyle("popup").setAnimated(false))
            }
        }
    }

    async checkKey() {
        // Check if public and private key matches
        const user = SessionManager.currentSession!.user!
        const privateKey = SessionManager.currentSession!.getUserPrivateKey()!
        const publicKey = user.publicKey

        if (!await Sodium.isMatchingEncryptionPublicPrivate(publicKey, privateKey)) {

            // Gather all keychain items, and check which ones are still valid
            // Oops! Error with public private key
            await LoginHelper.fixPublicKey(SessionManager.currentSession!)
            new Toast("We hebben jouw persoonlijke encryptiesleutel gecorrigeerd. Er was iets fout gegaan toen je je wachtwoord had gewijzigd.", "success green").setHide(15*1000).show()
            MemberManager.callListeners("encryption", null)
        }


        if (SessionManager.currentSession!.user!.incomingInvites.length > 0) {
            for (const invite of user.incomingInvites) {
                try {
                    const decryptedKeychainItems = await Sodium.unsealMessage(invite.keychainItems!, publicKey, privateKey)
                    await LoginHelper.addToKeychain(SessionManager.currentSession!, decryptedKeychainItems)
                    new Toast(invite.sender.firstName+" heeft een encryptiesleutel met jou gedeeld", "key green").setHide(15*1000).show()
                } catch (e) {
                    console.error(e)
                    new Toast(invite.sender.firstName+" wou een encryptiesleutel met jou delen, maar deze uitnodiging is ongeldig geworden. Vraag om de uitnodiging opnieuw te versturen.", "error red").setHide(15*1000).show()
                }
                
                // Remove invite if succeeded
                await SessionManager.currentSession!.authenticatedServer.request({
                    method: "POST",
                    path: "/invite/"+encodeURIComponent(invite.key)+"/trade"
                })
            }

            // Reload all views
            MemberManager.callListeners("encryption", null)
        }

        try {
            const keychainItem = Keychain.getItem(OrganizationManager.organization.publicKey)
            if (!keychainItem) {
                throw new Error("Missing organization keychain")
            }

            const session = SessionManager.currentSession!
            await session.decryptKeychainItem(keychainItem)

        } catch (e) {
            console.error(e)

            // Show warnign instead
            new Toast("Je hebt geen toegang tot de huidige encryptiesleutel van deze vereniging. Vraag een hoofdbeheerder om jou terug toegang te geven.", "key-lost yellow").setHide(15*1000).setButton(new ToastButton("Meer info", () => {
                this.present(new ComponentWithProperties(NoKeyView, {}).setDisplayStyle("popup"))
            })).show()
        }
    }

    get webshops() {
        return this.organization.webshops
    }

    switchOrganization() {
        SessionManager.deactivateSession()
    }

    openAll(animated = true) {
        this.currentlySelected = "group-all"
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(GroupMembersView, {}) }).setAnimated(animated));
    }

    openGroup(group: Group, animated = true) {
        this.currentlySelected = "group-"+group.id
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(GroupMembersView, { group }) }).setAnimated(animated));
    }

    manageKeys(animated = true) {
        this.currentlySelected = "keys"
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(KeysView) }).setAnimated(animated));
    }

    openCategory(category: GroupCategory, animated = true) {
        this.currentlySelected = "category-"+category.id
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(CategoryView, { category }) }).setAnimated(animated));
    }

    openCategoryMembers(category: GroupCategory, animated = true) {
        this.currentlySelected = "category-"+category.id

        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(GroupMembersView, {
            category: GroupCategoryTree.build(category, this.organization.meta.categories, this.organization.groups)
        }) }).setAnimated(animated));
    }

    openWebshop(webshop: WebshopPreview, animated = true) {
        this.currentlySelected = "webshop-"+webshop.id
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(WebshopView, { preview: webshop }) }).setAnimated(animated));
    }

    managePayments(animated = true) {
        this.currentlySelected = "manage-payments"
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(PaymentsView, {}) }).setAnimated(animated));
    }

    manageSettings(animated = true) {
        this.currentlySelected = "manage-settings"
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(SettingsView, {}) }).setAnimated(animated));
    }

    manageAccount(animated = true) {
        this.currentlySelected = "manage-account"
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(AccountSettingsView, {}) }).setAnimated(animated));
    }

    manageWhatsNew() {
        this.whatsNewBadge = ""

        window.open('https://www.stamhoofd.be/release-notes', '_blank');
        localStorage.setItem("what-is-new", WhatsNewCount.toString());
    }

    async logout() {
        if (!await CenteredMessage.confirm("Ben je zeker dat je wilt uitloggen?", "Uitloggen")) {
            return;
        }
        SessionManager.logout()
    }

    openSyncScoutsEnGidsen(animated = true) {
        this.currentlySelected = "manage-sgv-groepsadministratie"
        this.showDetail(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(SGVGroepsadministratieView, {}) }).setAnimated(animated));
    }

    importMembers() {
        new CenteredMessage("Binnenkort beschikbaar!", "Binnenkort kan je leden importeren via Excel of manueel.", "sync").addCloseButton().show()
    }

    addWebshop() {
        this.present(new ComponentWithProperties(EditWebshopView, { }).setDisplayStyle("popup"))
    }

    get canCreateWebshops() {
        return OrganizationManager.user.permissions?.canCreateWebshops(OrganizationManager.organization.privateMeta?.roles ?? [])
    }

    get canManagePayments() {
        return OrganizationManager.user.permissions?.canManagePayments(OrganizationManager.organization.privateMeta?.roles ?? [])
    }

    get fullAccess() {
        return SessionManager.currentSession!.user!.permissions!.hasFullAccess()
    }

    get fullReadAccess() {
        return SessionManager.currentSession!.user!.permissions!.hasReadAccess()
    }

    get enableMemberModule() {
        return this.organization.meta.modules.useMembers
    }

    get enableWebshopModule() {
        return this.organization.meta.modules.useWebshops
    }

    isCategoryDeactivated(category: GroupCategoryTree) {
        return this.organization.isCategoryDeactivated(category)
    }
}
</script>
