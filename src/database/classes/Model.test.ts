/* eslint-disable @typescript-eslint/unbound-method */
import { Model } from "./Model";
import { column } from "../decorators/Column";
import { Database } from "./Database";
import { ManyToManyRelation } from "./ManyToManyRelation";
import { ManyToOneRelation } from "./ManyToOneRelation";

describe("Model", () => {
    // Create a new class
    class TestModel extends Model {
        static table = "test_models";

        @column({ primary: true, type: "integer" })
        id: number | null = null;

        @column({ type: "string" })
        name: string;

        @column({ type: "integer" })
        count: number;

        @column({ type: "boolean" })
        isActive: boolean;

        @column({ type: "datetime" })
        createdOn: Date;

        @column({ type: "date", nullable: true })
        birthDay: Date | null = null;

        @column({ foreignKey: TestModel.partner, type: "integer", nullable: true })
        partnerId: number | null = null; // null = no address

        static partner = new ManyToOneRelation(TestModel, "partner");
        static friends = new ManyToManyRelation(TestModel, TestModel, "friends");
    }

    test("Not possible to choose own primary key for integer type primary", async () => {
        const m = new TestModel();
        m.id = 123;
        m.name = "My name";
        m.count = 1;
        m.isActive = true;
        m.createdOn = new Date();
        m.birthDay = new Date(1990, 0, 1);
        expect.assertions(1);
        try {
            await m.save();
        } catch (e) {
            expect(e.message).toMatch(/primary/i);
        }
    });

    test("Creating a model requires to set all properties", async () => {
        const m = new TestModel();
        m.name = "My name";
        m.isActive = true;
        m.createdOn = new Date();
        expect.assertions(1);
        try {
            await m.save();
        } catch (e) {
            expect(e.message).toMatch(/count/);
        }
    });

    test("Saving a new instance", async () => {
        const m = new TestModel();
        m.name = "My name";
        m.isActive = true;
        m.count = 1;
        m.createdOn = new Date();
        // MySQL cannot save milliseconds. Data is rounded if not set to zero.
        m.createdOn.setMilliseconds(0);

        m.birthDay = new Date(1990, 0, 1);
        await m.save();
        expect(m.existsInDatabase).toEqual(true);
        expect(m.id).toBeGreaterThanOrEqual(1);

        const [rows] = await Database.select("SELECT * from test_models where id = ?", [m.id]);
        expect(rows).toHaveLength(1);
        const row = rows[0];
        expect(row).toHaveProperty("test_models");
        const selected = TestModel.fromRow(row["test_models"]) as any;

        expect(selected).toEqual(m);
        expect(selected.id).toEqual(m.id);
    });

    test("You cannot set a relation directly", async () => {
        const other = new TestModel();
        other.name = "My partner";
        other.isActive = true;
        other.count = 1;
        other.createdOn = new Date();
        await other.save();
        expect(other.existsInDatabase).toEqual(true);

        const m = new TestModel();
        m.name = "My name";
        m.isActive = true;
        m.count = 1;
        m.createdOn = new Date();
        // MySQL cannot save milliseconds. Data is rounded if not set to zero.
        m.createdOn.setMilliseconds(0);

        m.birthDay = new Date(1990, 0, 1);

        // setRelation is the correct way to do it (it would throw now):
        //m.setRelation(TestModel.partner, other);
        // but we test what happens if we set the relation the wrong way
        (m as any).partner = other;

        try {
            await m.save();
            expect("Save didn't fail").toEqual("Save should fail");
        } catch (e) {
            expect(e.message).toMatch(/foreign key/);
        }
    });

    test("Save before setting a many to one relation", async () => {
        const other = new TestModel();
        other.name = "My partner";
        other.isActive = true;
        other.count = 1;
        other.createdOn = new Date();

        const m = new TestModel();
        m.name = "My name";
        m.isActive = true;
        m.count = 1;
        m.createdOn = new Date();
        // MySQL cannot save milliseconds. Data is rounded if not set to zero.
        m.createdOn.setMilliseconds(0);

        m.birthDay = new Date(1990, 0, 1);

        try {
            m.setRelation(TestModel.partner, other);
            await m.save();
            expect("Save didn't fail").toEqual("Save should fail");
        } catch (e) {
            expect(e.message).toMatch(/not yet saved/);
        }
    });

    test("Setting a many to one relation", async () => {
        const other = new TestModel();
        other.name = "My partner";
        other.isActive = true;
        other.count = 1;
        other.createdOn = new Date();
        await other.save();
        expect(other.existsInDatabase).toEqual(true);

        const m = new TestModel() as any;
        m.name = "My name";
        m.isActive = true;
        m.count = 1;
        m.createdOn = new Date();
        // MySQL cannot save milliseconds. Data is rounded if not set to zero.
        m.createdOn.setMilliseconds(0);

        m.birthDay = new Date(1990, 0, 1);
        m.setRelation(TestModel.partner, other);

        await m.save();
        expect(m.existsInDatabase).toEqual(true);
        expect(m.partnerId).toEqual(other.id);
        expect(m.partner.id).toEqual(other.id);
    });

    test("Setting a many to one relation by ID", async () => {
        const other = new TestModel();
        other.name = "My partner";
        other.isActive = true;
        other.count = 1;
        other.createdOn = new Date();
        await other.save();
        expect(other.existsInDatabase).toEqual(true);
        expect(other.partnerId).toEqual(null);
        expect(other.birthDay).toEqual(null);

        const m = new TestModel() as any;
        m.name = "My name";
        m.isActive = true;
        m.count = 1;
        m.createdOn = new Date();
        // MySQL cannot save milliseconds. Data is rounded if not set to zero.
        m.createdOn.setMilliseconds(0);

        m.birthDay = new Date(1990, 0, 1);
        m.partnerId = other.id;

        await m.save();
        expect(m.existsInDatabase).toEqual(true);
        expect(m.partnerId).toEqual(other.id);

        const [rows] = await Database.select("SELECT * from test_models where id = ?", [m.id]);
        expect(rows).toHaveLength(1);
        const row = rows[0];
        expect(row).toHaveProperty("test_models");
        const selected = TestModel.fromRow(row["test_models"]) as any;
        expect(selected.partnerId).toEqual(other.id);
    });

    test("Clearing a many to one relation", async () => {
        const other = new TestModel();
        other.name = "My partner";
        other.isActive = true;
        other.count = 1;
        other.createdOn = new Date();
        await other.save();
        expect(other.existsInDatabase).toEqual(true);

        const m = new TestModel() as any;
        m.name = "My name";
        m.isActive = true;
        m.count = 1;
        m.createdOn = new Date();
        m.partnerId = other.id;
        await m.save();
        expect(m.existsInDatabase).toEqual(true);
        expect(m.partnerId).toEqual(other.id);

        m.setOptionalRelation(TestModel.partner, null);
        await m.save();
        expect(m.partnerId).toEqual(null);

        const [rows] = await Database.select("SELECT * from test_models where id = ?", [m.id]);
        expect(rows).toHaveLength(1);
        const row = rows[0];
        expect(row).toHaveProperty("test_models");
        const selected = TestModel.fromRow(row["test_models"]) as any;
        expect(selected.partnerId).toEqual(null);
    });

    test("Clearing a many to one relation", async () => {
        const other = new TestModel();
        other.name = "My partner";
        other.isActive = true;
        other.count = 1;
        other.createdOn = new Date();
        expect(await other.save()).toEqual(true);
        expect(other.existsInDatabase).toEqual(true);

        const m = new TestModel() as any;
        m.name = "My name";
        m.isActive = true;
        m.count = 1;
        m.createdOn = new Date();
        m.partnerId = other.id;
        expect(await m.save()).toEqual(true);

        expect(m.existsInDatabase).toEqual(true);
        expect(m.partnerId).toEqual(other.id);

        m.partnerId = null;
        expect(await m.save()).toEqual(true);
        expect(m.partnerId).toEqual(null);

        const [rows] = await Database.select("SELECT * from test_models where id = ?", [m.id]);
        expect(rows).toHaveLength(1);
        const row = rows[0];
        expect(row).toHaveProperty("test_models");
        const selected = TestModel.fromRow(row["test_models"]) as any;
        expect(selected.partnerId).toEqual(null);
    });

    test("No query if no changes", async () => {
        const other = new TestModel();
        other.name = "No query if no changes";
        other.isActive = true;
        other.count = 1;
        other.createdOn = new Date();

        const firstSave = await other.save();
        expect(firstSave).toEqual(true);

        expect(other.existsInDatabase).toEqual(true);
        expect(other.partnerId).toEqual(null);
        expect(other.birthDay).toEqual(null);

        other.count = 1;
        const saved = await other.save();
        expect(saved).toEqual(false);
    });

    test("Update a model", async () => {
        const other = new TestModel();
        other.name = "Update a model";
        other.isActive = true;
        other.count = 1;
        other.createdOn = new Date();

        expect(other.existsInDatabase).toEqual(false);
        expect(await other.save()).toEqual(true);
        expect(other.existsInDatabase).toEqual(true);

        other.count = 2;
        expect(await other.save()).toEqual(true);
        expect(other.existsInDatabase).toEqual(true);
    });
});
