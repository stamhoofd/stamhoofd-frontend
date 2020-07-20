import { ArrayDecoder,AutoEncoder, field, StringDecoder } from '@simonbackx/simple-encoding';
import { v4 as uuidv4 } from "uuid";

import { Group } from '../Group';
import { MemberDetails } from './MemberDetails';
import { Registration } from './Registration';

export class DecryptedMember extends AutoEncoder {
    @field({ decoder: StringDecoder, defaultValue: () => uuidv4() })
    id: string;

    @field({ decoder: MemberDetails, nullable: true })
    details: MemberDetails | null

    @field({ decoder: StringDecoder })
    publicKey: string

    @field({ decoder: new ArrayDecoder(Registration) })
    registrations: Registration[]

    // Calculated properties for convenience
    @field({ decoder: new ArrayDecoder(Registration), optional: true })
    activeRegistrations: Registration[] = []

    @field({ decoder: new ArrayDecoder(Group), optional: true })
    groups: Group[] = []

    /**
     * Pass all the groups of an organization to the member so we can fill in all the groups and registrations that are active
     */
    fillGroups(groups: Group[]) {
        this.activeRegistrations = []
        const groupMap = new Map<string, Group>()
        for (const registration of this.registrations) {
            const group = groups.find(g => g.id == registration.groupId)
            if (group) {
                if (group.cycle == registration.cycle && registration.deactivatedAt === null) {
                    this.activeRegistrations.push(registration)
                    groupMap.set(group.id, group)
                }
            }
        }
        this.groups = Array.from(groupMap.values())
    }

}