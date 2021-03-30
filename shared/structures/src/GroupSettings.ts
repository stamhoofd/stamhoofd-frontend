import { ArrayDecoder,AutoEncoder, BooleanDecoder,DateDecoder, EnumDecoder,field, IntegerDecoder,StringDecoder } from '@simonbackx/simple-encoding';

import { Image } from './files/Image';
import { GroupGenderType } from './GroupGenderType';
import { GroupPrices } from './GroupPrices';


export enum OldWaitingListType {
    None = "None",
    PreRegistrations = "PreRegistrations",
    ExistingMembersFirst = "ExistingMembersFirst",
    All = "All"
}

export enum WaitingListType {
    /// Never provide a waiting list. When limit is reached -> reject
    None = "None",

    /// All new members on waiting list, OR existing members if limit is reached
    ExistingMembersFirst = "ExistingMembersFirst",

    /// Everyone on waiting list.
    All = "All",

    /// Only on waiting list if limit is reached
    Limit = "Limit"
}

export class GroupSettings extends AutoEncoder {
    @field({ decoder: StringDecoder })
    name = ""

    @field({ decoder: StringDecoder })
    description = ""

    @field({ decoder: DateDecoder })
    @field({ decoder: DateDecoder, version: 33, upgrade: (d: Date) => {
        const d2 = new Date(d)
        d2.setUTCHours(-2, 0, 0, 0) // brussels time
        return d2
    } })
    startDate: Date

    @field({ decoder: DateDecoder })
    @field({ decoder: DateDecoder, version: 33, upgrade: (d: Date) => {
        const d2 = new Date(d)
        d2.setUTCHours(23-2, 59, 0, 0) // brussels time
        return d2
    } })
    endDate: Date

    /**
     * Dispay start and end date times
     */
    @field({ decoder: BooleanDecoder, version: 78 })
    displayStartEndTime = false

    @field({ decoder: DateDecoder, nullable: true, version: 73, upgrade: function(this: GroupSettings){ return this.startDate } })
    registrationStartDate: Date

    @field({ decoder: DateDecoder, nullable: true, version: 73, upgrade: function(this: GroupSettings){ return this.endDate } })
    registrationEndDate: Date

    @field({ decoder: new ArrayDecoder(GroupPrices) })
    prices: GroupPrices[] = []

    @field({ decoder: new EnumDecoder(GroupGenderType) })
    genderType: GroupGenderType = GroupGenderType.Mixed

    @field({ decoder: IntegerDecoder, nullable: true, field: "maxBirthYear" })
    @field({ decoder: IntegerDecoder, nullable: true, version: 12, upgrade: (year) => {
        if (year === null) {
            return null;
        }
        return 2020 - year
    } })
    minAge: number | null = null

    @field({ decoder: IntegerDecoder, nullable: true, field: "minBirthYear" })
    @field({
        decoder: IntegerDecoder, nullable: true, version: 12, upgrade: (year) => {
            if (year === null) {
                return null;
            }
            return 2020 - year
        }
    })
    maxAge: number | null = null

    @field({ decoder: new EnumDecoder(OldWaitingListType), version: 16 })
    @field({ 
        decoder: new EnumDecoder(WaitingListType), 
        version: 75, 
        upgrade: (old: OldWaitingListType): WaitingListType => {
            if (old === OldWaitingListType.None) {
                return WaitingListType.None
            }

            if (old === OldWaitingListType.All) {
                return WaitingListType.All
            }

            if (old === OldWaitingListType.PreRegistrations) {
                return WaitingListType.Limit
            }

            if (old === OldWaitingListType.ExistingMembersFirst) {
                return WaitingListType.ExistingMembersFirst
            }

            return WaitingListType.Limit
        }
    })
    waitingListType: WaitingListType = WaitingListType.None

    @field({ decoder: DateDecoder, nullable: true, version: 16 })
    @field({ 
        decoder: DateDecoder, 
        nullable: true, 
        version: 74, 
        upgrade: function(this: GroupSettings, old: Date | null): Date | null {
            // Clear value if waiting list type is not preregistrations
            if ((this.waitingListType as any as OldWaitingListType) === OldWaitingListType.PreRegistrations) {
                return old
            }
            return null
        } 
    })
    preRegistrationsDate: Date | null = null

    @field({ 
        decoder: IntegerDecoder, nullable: true, version: 16, 
    })
    @field({ 
        decoder: IntegerDecoder, 
        nullable: true, 
        version: 74, 
        upgrade: function(this: GroupSettings, old: number | null): number | null {
            // Clear value if waiting list type is none
            if ((this.waitingListType as any as OldWaitingListType) !== OldWaitingListType.None) {
                return old
            }
            return null
        }
    })
    maxMembers: number | null = null

    /**
     * If maxMembers is not null, this will get filled in by the backend
     */
    @field({ 
        decoder: IntegerDecoder, 
        nullable: true, 
        version: 77
    })
    registeredMembers: number | null = null

    /**
     * Of er voorrang moet gegeven worden aan broers en/of zussen als er wachtlijsten of voorinschrijvingen zijn
     */
    @field({ decoder: BooleanDecoder, version: 16 })
    priorityForFamily = true

    /**
     * @deprecated
     */
    @field({ decoder: new ArrayDecoder(Image), version: 58 })
    images: Image[] = []

    @field({ decoder: Image, nullable: true, version: 65 })
    coverPhoto: Image | null = null

    @field({ decoder: Image, nullable: true, version: 66 })
    squarePhoto: Image | null = null

    @field({ decoder: StringDecoder, version: 76 })
    location = ""

    getGroupPrices(date: Date) {
        let foundPrice: GroupPrices | undefined = undefined

        // Determine price
        for (const price of this.prices) {
            if (!price.startDate || price.startDate <= date) {
                foundPrice = price
            }
        }
        return foundPrice
    }
}

export const GroupSettingsPatch = GroupSettings.patchType()