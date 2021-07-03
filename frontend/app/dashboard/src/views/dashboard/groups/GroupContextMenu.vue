<template>
    <ContextMenu v-bind="{ x, y }">

        <ContextMenuItem v-if="hasWrite" @click="editGroup">
            Gegevens wijzigen
            <span slot="right" class="icon edit" />
        </ContextMenuItem>
      
        <ContextMenuItem v-if="hasWrite" @click="duplicateGroup">
            Dupliceren
            <span slot="right" class="icon copy" />
        </ContextMenuItem>

        <ContextMenuLine v-if="canDelete" />
      
        <ContextMenuItem v-if="canDelete" @click="deleteGroup">
            <span slot="right" class="icon trash" />
            Verwijderen
        </ContextMenuItem>

    </ContextMenu>
</template>

<script lang="ts">
import {AutoEncoderPatchType} from "@simonbackx/simple-encoding";
import {ComponentWithProperties, NavigationMixin} from "@simonbackx/vue-app-navigation";
import {ContextMenu, ContextMenuItem, ContextMenuLine, Toast} from "@stamhoofd/components";
import {Logger} from "@stamhoofd/logger";
import {
  getPermissionLevelNumber,
  Group,
  GroupCategory,
  GroupPrivateSettings,
  Organization,
  OrganizationMetaData,
  ParentTypeHelper,
  PermissionLevel
} from '@stamhoofd/structures';
import {Component, Mixins, Prop} from "vue-property-decorator";

import {OrganizationManager} from "../../../classes/OrganizationManager";
import EditGroupView from "./EditGroupView.vue";

@Component({
  components: {
    ContextMenu,
    ContextMenuItem,
    ContextMenuLine,
  },
})
export default class GroupContextMenu extends Mixins(NavigationMixin) {
  @Prop({default: 0})
  x!: number;

  @Prop({default: 0})
  y!: number;

  @Prop({default: null})
  group: Group | null;

  created() {
    (this as any).ParentTypeHelper = ParentTypeHelper;
  }

  get canDelete(): boolean {
    if (!OrganizationManager.user.permissions) {
      return false
    }

    if (!this.group?.privateSettings || getPermissionLevelNumber(this.group.privateSettings.permissions.getPermissionLevel(OrganizationManager.user.permissions)) < getPermissionLevelNumber(PermissionLevel.Write)) {
      return false
    }

    return true
  }

  get hasWrite(): boolean {
    if (!OrganizationManager.user.permissions) {
      return false
    }

    if (this.group?.privateSettings && getPermissionLevelNumber(this.group.privateSettings.permissions.getPermissionLevel(OrganizationManager.user.permissions)) >= getPermissionLevelNumber(PermissionLevel.Write)) {
      return true
    }

    return false
  }

  deleteGroup() {
    if (confirm("Ben je zeker dat je deze groep wilt verwijderen? All leden worden automatisch ook uitgeschreven. Je kan dit niet ongedaan maken!")) {
      if (confirm("Heel zeker?")) {
        const patch = OrganizationManager.getPatch()
        patch.groups.addDelete(this.group.id)
        OrganizationManager.patch(patch)
            .then(() => {
              new Toast("De groep is verwijderd", "green success").show()
            })
            .catch(e => {
              Logger.error(e)
              new Toast("Er ging iets mis: " + (e.human ?? e.message), "error").show()
            })
      }
    }
  }

  editGroup() {
    this.present(new ComponentWithProperties(EditGroupView, {
      group: this.group,
      organization: OrganizationManager.organization,
      saveHandler: async (patch: AutoEncoderPatchType<Organization>) => {
        patch.id = OrganizationManager.organization.id
        await OrganizationManager.patch(patch)
        const g = OrganizationManager.organization.groups.find(g => g.id === this.group!.id)
        if (!g) {
          this.pop({force: true})
        } else {
          this.group!.set(g)
        }
      }
    }).setDisplayStyle("popup"))
  }

  duplicateGroup() {
    const newGroup = Group.create({
      settings: this.group?.settings,
      privateSettings: GroupPrivateSettings.create({})
    })
    const meta = OrganizationMetaData.patch({})

    const me = GroupCategory.patch({id: this.groupCategory.id})
    me.groupIds.addPut(newGroup.id)
    meta.categories.addPatch(me)

    const p = Organization.patch({
      id: this.organization.id,
      meta
    })

    p.groups.addPut(newGroup)

    this.present(new ComponentWithProperties(EditGroupView, {
      group: newGroup,
      organization: this.organization.patch(p),
      saveHandler: async (patch: AutoEncoderPatchType<Organization>) => {
        await OrganizationManager.patch(p.patch(patch))
      }
    }).setDisplayStyle("popup"))
  }

  get groupCategory() {
    return OrganizationManager.organization.categoryTree.categories
        .find(category => category.groups
            .find(group => group.id === group.id))
  }

  get organization() {
    return OrganizationManager.organization
  }


}
</script>
