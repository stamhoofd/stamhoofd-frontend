import { AutoEncoder, DateDecoder, field, IntegerDecoder, StringDecoder } from "@simonbackx/simple-encoding"
import { v4 as uuidv4 } from "uuid";

export class STCredit extends AutoEncoder {
    @field({ decoder: StringDecoder, defaultValue: () => uuidv4() })
    id: string

    /**
     * Credits in cents
     */
    @field({ decoder: IntegerDecoder })
    change = 0

    @field({ decoder: StringDecoder })
    description = ""

    @field({ decoder: DateDecoder })
    createdAt: Date = new Date()

    @field({ decoder: DateDecoder, nullable: true })
    expireAt: Date | null = null
}
