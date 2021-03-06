import { Decoder, ObjectData, VersionBox, VersionBoxDecoder } from '@simonbackx/simple-encoding'
import { IDRegisterCheckout, RegisterCheckout, Version } from '@stamhoofd/structures'

import { MemberManager } from './MemberManager'
import { OrganizationManager } from './OrganizationManager'
import { TabBarItem } from './TabBarItem';

/**
 * Convenient access to the organization of the current session
 */
export class CheckoutManagerStatic {
    private _checkout: RegisterCheckout | null = null

    watchTabBar: TabBarItem | null = null

    saveCart() {
        this.saveCheckout()
    }

    get checkout(): RegisterCheckout {
        if (!this._checkout) {
            this._checkout = this.loadCheckout()
        }
        return this._checkout
    }

    get cart() {
        return this.checkout.cart
    }

    loadCheckout(): RegisterCheckout {
        try {
            const json = localStorage.getItem("checkout")
            if (json) {
                const obj = JSON.parse(json)
                const versionBox = new VersionBoxDecoder(IDRegisterCheckout as Decoder<IDRegisterCheckout>).decode(new ObjectData(obj, { version: Version }))
                return versionBox.data.convert(OrganizationManager.organization, MemberManager.members ?? [])
            }
        } catch (e) {
            console.error("Failed to load cart")
            console.error(e)
        }
        return new RegisterCheckout()
    }

    saveCheckout() {
        try {
            const data = new VersionBox(this.checkout.convert()).encode({ version: Version })
            const json = JSON.stringify(data)
            localStorage.setItem("checkout", json)
        } catch (e) {
            console.error("Failed to load cart")
            console.error(e)
        }

        if (this.watchTabBar) {
            this.watchTabBar.badge = this.cart.count === 0 ? "" : this.cart.count+""
        }
    }
}

export const CheckoutManager = new CheckoutManagerStatic()