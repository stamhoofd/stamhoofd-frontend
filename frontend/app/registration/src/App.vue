<template>
    <div id="app">
        <PromiseView :promise="promise" />
        <ToastBox />
    </div>
</template>

<script lang="ts">
import { Decoder } from '@simonbackx/simple-encoding';
import { ComponentWithProperties, HistoryManager,ModalStackComponent, NavigationController } from "@simonbackx/vue-app-navigation";
import { AuthenticatedView, CenteredMessage, ColorHelper, PromiseView, Toast, ToastBox } from '@stamhoofd/components';
import { LoginHelper, NetworkManager, Session,SessionManager } from '@stamhoofd/networking';
import { Organization } from '@stamhoofd/structures';
import { Component, Vue } from "vue-property-decorator";

import { CheckoutManager } from './classes/CheckoutManager';
import { MemberManager } from './classes/MemberManager';
import { TabBarItem } from "./classes/TabBarItem"
import InvalidOrganizationView from './views/errors/InvalidOrganizationView.vue';
import HomeView from './views/login/HomeView.vue';
import RegistrationTabBarController from './views/overview/RegistrationTabBarController.vue';

async function getDefaultView() {
    //if (MemberManager.members!.find(m => m.activeRegistrations.length > 0)) {
    //    return (await import(/* webpackChunkName: "RegistrationOverview" */ "./views/overview/OverviewView.vue")).default
    //}
    return (await import(/* webpackChunkName: "RegistrationOverview" */ "./views/overview/OverviewView.vue")).default;
}

async function getAccountView() {
    return (await import(/* webpackChunkName: "AccountSettingsView" */ "./views/account/AccountSettingsView.vue")).default;
}

async function getCartView() {
    return (await import(/* webpackChunkName: "CartView" */ "./views/checkout/CartView.vue")).default;
}

@Component({
    components: {
        ToastBox,
        PromiseView
    },
})
export default class App extends Vue {
    promise = async () => {
        console.log("Fetching organization from domain...")

        // get organization
        try {
            const response = await NetworkManager.server.request({
                method: "GET",
                path: "/organization-from-domain",
                query: {
                    domain: window.location.hostname
                },
                decoder: Organization as Decoder<Organization>
            })
            console.log("Organization fetched!")

            if (!response.data.meta.modules.useMembers) {
                throw new Error("Member module disabled")
            }

            // Set organization and session
            const session = new Session(response.data.id)
            await session.loadFromStorage()       
            session.setOrganization(response.data)         

            // Set color
            if (response.data.meta.color) {
                ColorHelper.setColor(response.data.meta.color)
            }

            await SessionManager.setCurrentSession(session)

            const path = window.location.pathname;
            const parts = path.substring(1).split("/");

            if (parts.length == 1 && parts[0] == 'verify-email') {
                const queryString = new URL(window.location.href).searchParams;
                const token = queryString.get('token')
                const code = queryString.get('code')
                    
                if (token && code) {
                    const toast = new Toast("E-mailadres valideren...", "spinner").setHide(null).show()
                    LoginHelper.verifyEmail(session, code, token).then(() => {
                        toast.hide()
                        new Toast("E-mailadres is gevalideerd", "success green").show()
                    }).catch(e => {
                        toast.hide()
                        CenteredMessage.fromError(e).addCloseButton().show()
                    })
                }
            }

            return new ComponentWithProperties(AuthenticatedView, {
                root: new ComponentWithProperties(PromiseView, {
                    promise: async () => {
                        await MemberManager.loadMembers();

                        const basket = new TabBarItem(
                            "Mandje",
                            "basket",
                            new ComponentWithProperties(NavigationController, { 
                                root: new ComponentWithProperties(await getCartView(), {}),
                            })
                        )
                        CheckoutManager.watchTabBar = basket
                        basket.badge = CheckoutManager.cart.count > 0 ? (CheckoutManager.cart.count + "") : null

                        return new ComponentWithProperties(ModalStackComponent, {
                            root: new ComponentWithProperties(RegistrationTabBarController, { 
                                items: [
                                    new TabBarItem(
                                        "Inschrijven",
                                        "edit",
                                        new ComponentWithProperties(NavigationController, { 
                                            root: new ComponentWithProperties(await getDefaultView(), {}),
                                        })
                                    ),
                                    new TabBarItem(
                                        "Account",
                                        "user",
                                        new ComponentWithProperties(NavigationController, { 
                                            root: new ComponentWithProperties(await getAccountView(), {}),
                                        })
                                    ),
                                    basket
                                ]
                            })
                        })
                    }
                }),
                loginRoot: new ComponentWithProperties(ModalStackComponent, {
                    root: new ComponentWithProperties(HomeView, {}) 
                })
            });
        } catch (e) {
            console.error(e)
            return new ComponentWithProperties(InvalidOrganizationView, {})
        }
    }

    mounted() {
        HistoryManager.activate();
    }
    
}
</script>

<style lang="scss">
// We need to include the component styling of vue-app-navigation first
@use "~@stamhoofd/scss/main";
@import "~@simonbackx/vue-app-navigation/dist/main.css";
</style>
