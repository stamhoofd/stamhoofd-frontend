<template>
    <div class="st-view boxed">
        <STNavigationBar :large="true">
            <BackButton v-if="canPop" slot="left" @click="pop" />
        </STNavigationBar>

        <div class="box">
            <main>
                <h1>Kies je betaalmethode</h1>

                <STErrorsDefault :error-box="errorBox" />

                <PaymentSelectionList v-model="selectedPaymentMethod" :payment-methods="paymentMethods" :organization="organization" />
            </main>

            <STToolbar>
                <span slot="left">Totaal: {{ checkout.totalPrice | price }}</span>
                <LoadingButton slot="right" :loading="loading">
                    <button class="button primary" @click="goNext">
                        <span>Bestelling bevestigen</span>
                    </button>
                </LoadingButton>
            </STToolbar>
        </div>
    </div>
</template>

<script lang="ts">
import { Decoder } from '@simonbackx/simple-encoding';
import { isSimpleError, isSimpleErrors, SimpleErrors } from '@simonbackx/simple-errors';
import { ComponentWithProperties, HistoryManager, NavigationController, NavigationMixin } from "@simonbackx/vue-app-navigation";
import { BackButton, ErrorBox, LoadingButton, PaymentHandler,PaymentSelectionList, Radio, STErrorsDefault,STList, STListItem, STNavigationBar, STToolbar, Toast } from "@stamhoofd/components"
import { OrderData, OrderResponse, Payment, PaymentMethod } from '@stamhoofd/structures';
import { Formatter } from '@stamhoofd/utility';
import { Component, Mixins } from "vue-property-decorator";

import { CheckoutManager } from '../../classes/CheckoutManager';
import { WebshopManager } from '../../classes/WebshopManager';
import OrderView from '../orders/OrderView.vue';
import CartView from './CartView.vue';
import { CheckoutStepType } from './CheckoutStepsManager';

@Component({
    components: {
        STNavigationBar,
        STToolbar,
        STList,
        STListItem,
        Radio,
        LoadingButton,
        STErrorsDefault,
        PaymentSelectionList,
        BackButton
    },
    filters: {
        price: Formatter.price.bind(Formatter),
        dateWithDay: (d: Date) => Formatter.capitalizeFirstLetter(Formatter.dateWithDay(d)),
        minutes: Formatter.minutes.bind(Formatter)
    }
})
export default class PaymentSelectionView extends Mixins(NavigationMixin){
    step = -1

    loading = false
    errorBox: ErrorBox | null = null
    CheckoutManager = CheckoutManager

    get selectedPaymentMethod(): PaymentMethod | null {
        return CheckoutManager.checkout.paymentMethod
    }

    set selectedPaymentMethod(paymentMethod: PaymentMethod | null) {
        CheckoutManager.checkout.paymentMethod = paymentMethod
        CheckoutManager.saveCheckout()
    }

    get checkout() {
        return CheckoutManager.checkout
    }

    get checkoutMethod() {
        return CheckoutManager.checkout.checkoutMethod!
    }

    get webshop() {
        return WebshopManager.webshop
    }

    get organization() {
       return WebshopManager.organization
    }

    get paymentMethods() {
        return this.webshop.meta.paymentMethods
    }

    goToOrder(id: string) {
        this.navigationController!.push(new ComponentWithProperties(OrderView, { orderId: id, success: true }), true, this.navigationController!.components.length - 1)
    }
   
    async goNext() {
        if (this.loading) {
            return
        }
        this.loading = true

        try {
           // Place order
           const response = await WebshopManager.server.request({
                method: "POST",
                path: "/webshop/"+this.webshop.id+"/order",
                body: OrderData.create(CheckoutManager.checkout as any), // todo: add some manual casting here
                decoder: OrderResponse as Decoder<OrderResponse>
            })

            const payment = response.data.order.payment
            if (payment) {
                PaymentHandler.handlePayment({
                    server: WebshopManager.server, 
                    organization: this.organization, 
                    payment, 
                    paymentUrl: response.data.paymentUrl, 
                    returnUrl: "https://"+this.webshop.getUrl(this.organization)+"/payment?id="+encodeURIComponent(payment.id),
                    component: this,
                    transferSettings: WebshopManager.webshop.meta.transferSettings,
                    type: "order"
                }, (payment: Payment) => {
                    console.log("Success")
                    // success
                    this.loading = false
                    this.goToOrder(response.data.order.id)
                }, (payment: Payment) => {
                    console.log(payment)
                    // failure
                    this.loading = false
                })
                return;
            }

            // Go to success page
            this.show(new ComponentWithProperties(OrderView, { initialOrder: response.data.order, success: true }))
            
        } catch (e) {
            console.error(e)
            

            let error = e

            if (isSimpleError(e)) {
                error = new SimpleErrors(e)
            }

            if (isSimpleErrors(error)) {
                if (error.hasFieldThatStartsWith("cart")) {
                    // A cart error: force a reload and go back to the cart.
                    await WebshopManager.reload()
                    
                    this.present(new ComponentWithProperties(NavigationController, { root: new ComponentWithProperties(CartView, {})}).setDisplayStyle("popup"))
                    this.navigationController!.popToRoot({ force: true }).catch(e => console.error(e))
                } else if (error.hasFieldThatStartsWith("fieldAnswers")) {
                    // A cart error: force a reload and go back to the cart.
                    await WebshopManager.reload()
                    this.pop({ force: true })
                    Toast.fromError(e).show()
                }


            }
            this.errorBox = new ErrorBox(e)

            
        }
        this.loading = false
    }

    mounted() {
        console.log("set payment")
        HistoryManager.setUrl(WebshopManager.webshop.getUrlSuffix()+"/checkout/"+CheckoutStepType.Payment.toLowerCase())
    }

    activated() {
        this.$nextTick(() => {
            console.log("set payment")
            HistoryManager.setUrl(WebshopManager.webshop.getUrlSuffix()+"/checkout/"+CheckoutStepType.Payment.toLowerCase())
        });
    }
}
</script>

<style lang="scss">
@use "@stamhoofd/scss/base/variables.scss" as *;
@use "@stamhoofd/scss/base/text-styles.scss" as *;


</style>