import { ArrayDecoder, AutoEncoder, field, IntegerDecoder, ObjectData, PartialWithoutMethods } from '@simonbackx/simple-encoding';
import { isSimpleError, isSimpleErrors, SimpleError, SimpleErrors } from '@simonbackx/simple-errors';
import { Formatter } from '@stamhoofd/utility';

import { Option, OptionMenu, Product, ProductPrice } from './Product';
import { Webshop } from './Webshop';
import { WebshopFieldAnswer } from './WebshopField';

export class CartItemOption extends AutoEncoder {
    @field({ decoder: Option })
    option: Option;

    @field({ decoder: OptionMenu })
    optionMenu: OptionMenu;
}

export class CartItem extends AutoEncoder {

    @field({ decoder: Product })
    product: Product;

    @field({ decoder: ProductPrice })
    productPrice: ProductPrice;
    
    @field({ decoder: new ArrayDecoder(CartItemOption) })
    options: CartItemOption[] = []

    @field({ decoder: new ArrayDecoder(WebshopFieldAnswer), version: 94 })
    fieldAnswers: WebshopFieldAnswer[] = []

    @field({ decoder: IntegerDecoder })
    amount = 1;

    static create<T extends typeof AutoEncoder>(this: T, object: PartialWithoutMethods<CartItem>): InstanceType<T>  {
        const c = super.create(object) as CartItem

        // Fill in all default options here
        for (const optionMenu of c.product.optionMenus) {
            if (optionMenu.multipleChoice) {
                continue;
            }

            if (c.options.find(o => o.optionMenu.id === optionMenu.id)) {
                continue
            }

            c.options.push(CartItemOption.create({
                option: optionMenu.options[0],
                optionMenu: optionMenu
            }))

        }

        return c as InstanceType<T>
    }

    /**
     * Unique identifier to check if two cart items are the same
     */
    get id(): string {
        return this.product.id+"."+this.productPrice.id+"."+this.options.map(o => o.option.id).join(".")+"."+this.fieldAnswers.map(a => a.field.id+"-"+Formatter.slug(a.answer)).join(".");
    }

    /**
     * Return total amount of same product in the given cart. Always includes the current item, even when it isn't in the cart. Doesn't count it twice
     */
    getTotalAmount(cart: Cart) {
        return cart.items.reduce((c, item) => {
            if (item.product.id !== this.product.id) {
                return c
            }

            if (item.id === this.id) {
                return c
            }
            return c + item.amount
        }, 0) + this.amount
    }

    getUnitPrice(cart: Cart): number {
        const amount = this.getTotalAmount(cart)
        let price = this.productPrice.price

        if (this.productPrice.discountPrice !== null && amount >= this.productPrice.discountAmount) {
            price = this.productPrice.discountPrice
        }
        for (const option of this.options) {
            price += option.option.price
        }
        return Math.max(0, price)
    }

    getPrice(cart: Cart): number {
        return this.getUnitPrice(cart) * this.amount
    }

    get description(): string {
        const descriptions: string[] = []
        if (this.product.prices.length > 1) {
            descriptions.push(this.productPrice.name)
        }
        for (const option of this.options) {
            descriptions.push(option.option.name)
        }

        for (const a of this.fieldAnswers) {
            if (!a.answer) {
                continue
            }
            descriptions.push(a.field.name+": "+a.answer)
        }
        return descriptions.join("\n")
    }

    duplicate(version: number) {
        return CartItem.decode(new ObjectData(this.encode({ version }), { version }))
    }

    validateAnswers() {
        const newAnswers: WebshopFieldAnswer[] = []
        for (const field of this.product.customFields) {
            const answer = this.fieldAnswers.find(a => a.field.id === field.id)

            try {
                if (!answer) {
                    const a = WebshopFieldAnswer.create({ field, answer: "" })
                    a.validate()
                    newAnswers.push(a)
                } else {
                    answer.field = field
                    answer.validate()
                    newAnswers.push(answer)
                }
            } catch (e) {
                if (isSimpleError(e) || isSimpleErrors(e)) {
                    e.addNamespace("fieldAnswers."+field.id)
                }
                throw e
            }
            
        }
        this.fieldAnswers = newAnswers
    }

    /**
     * Update self to the newest available data and throw if it was not able to recover
     */
    validate(webshop: Webshop) {
        const product = webshop.products.find(p => p.id == this.product.id)
        if (!product || !product.enabled) {
            throw new SimpleError({
                code: "product_unavailable",
                message: "Product unavailable",
                human: this.product.name+" is niet meer beschikbaar"
            })
        }

        if (product.isSoldOut) {
            throw new SimpleError({
                code: "product_unavailable",
                message: "Product unavailable",
                human: this.product.name+" is uitverkocht"
            })
        }

        if (product.remainingStock !== null && product.remainingStock < this.amount) {
            throw new SimpleError({
                code: "product_unavailable",
                message: "No remaining stock",
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                human: "Er zijn nog maar "+product.remainingStock+" stuks beschikbaar van "+this.product.name
            })
        }

        const productPrice = product.prices.find(p => p.id === this.productPrice.id)
        if (!productPrice) {
            throw new SimpleError({
                code: "product_price_unavailable",
                message: "Product price unavailable",
                human: "Eén of meerdere keuzemogelijkheden van "+this.product.name+" zijn niet meer beschikbaar, voeg het opnieuw toe"
            })
        }

        this.product = product
        this.productPrice = productPrice

        // Check all options
        const remainingMenus = this.product.optionMenus.slice()

        for (const o of this.options) {
            let index = remainingMenus.findIndex(m => m.id === o.optionMenu.id)
            if (index == -1) {
                // Check if it has a multiple choice one
                index = this.product.optionMenus.findIndex(m => m.id === o.optionMenu.id)
                throw new SimpleError({
                    code: "option_menu_unavailable",
                    message: "Option menu unavailable",
                    human: "Eén of meerdere keuzemogelijkheden van "+this.product.name+" zijn niet meer beschikbaar, voeg het opnieuw toe"
                })
            }

            const menu = remainingMenus[index]
            if (!menu.multipleChoice) {
                // Already used: not possible to add another
                remainingMenus.splice(index, 1)[0]
            }
            
            const option = menu.options.find(m => m.id === o.option.id)

            if (!option) {
                throw new SimpleError({
                    code: "option_unavailable",
                    message: "Option unavailable",
                    human: "Eén of meerdere keuzemogelijkheden van "+this.product.name+" zijn niet meer beschikbaar, voeg het opnieuw toe"
                })
            }

            // Update to latest data
            o.optionMenu = menu
            o.option = option
        }

        if (remainingMenus.filter(m => !m.multipleChoice).length > 0) {
            throw new SimpleError({
                code: "missing_menu",
                message: "Missing menu's "+remainingMenus.filter(m => !m.multipleChoice).map(m => m.name).join(", "),
                human: "Er zijn nieuwe keuzemogelijkheden voor "+this.product.name+" waaruit je moet kiezen, voeg het opnieuw toe"
            })
        }

        this.validateAnswers()
    }

}

export class Cart extends AutoEncoder {
    @field({ decoder: new ArrayDecoder(CartItem) })
    items: CartItem[] = []

    addItem(item: CartItem) {
        const c = item.id
        for (const i of this.items) {
            if (i.id === c) {
                i.amount += item.amount
                return
            }
        }
        this.items.push(item)
    }

    removeItem(item: CartItem) {
        const c = item.id
        for (const [index, i] of this.items.entries()) {
            if (i.id === c) {
                this.items.splice(index, 1)
                return
            }
        }
    }

    get price() {
        return this.items.reduce((c, item) => c + item.getPrice(this), 0)
    }

    get count() {
        return this.items.reduce((c, item) => c + item.amount, 0)
    }

    validate(webshop: Webshop) {
        const newItems: CartItem[] = []
        const errors = new SimpleErrors()
        for (const item of this.items) {
            try {
                item.validate(webshop)
                newItems.push(item)
            } catch (e) {
                errors.addError(e)
            }
        }

        // todo: validate stock

        this.items = newItems
        errors.throwIfNotEmpty()
    }
}