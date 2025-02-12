import * as Discord from "discord.js";

import { Component, DiscordFragment } from "./index";
import { PartialOf, ReplaceWith } from "./utils";
import { HasChildren, HasInternalTag, Listenable } from "./mixins";

declare global {
  type DiscordNode = JSX.Element;
  type StateSetter<S> = (
    state: Partial<S>,
    interaction?: Discord.ButtonInteraction | Discord.AnySelectMenuInteraction
  ) => void;
  type ComponentRenderer = () => DiscordNode;
  type MessageContainer =
    | Discord.BaseChannel
    | Discord.BaseInteraction
    | Discord.Message;

  namespace JSX {
    type Element = Rendered[IntrinsicKeys] | Component | DiscordFragment;
    type DiscordNodeReplacer<T, K extends keyof T> = ReplaceWith<
      T,
      K,
      { [N in K]: DiscordNode | DiscordNode[] | T[N] }
    >;
    type IntrinsicKeys = keyof IntrinsicProps;
    interface ChildResolvable {
      message: never;
      br: never;
      embed: Discord.APIEmbedField | DiscordNode;
      footer: DiscordNode;
      field: DiscordNode;
      emoji: never;
      row:
        | Discord.ButtonBuilder
        | Discord.BaseSelectMenuBuilder<Discord.APISelectMenuComponent>;
      button: DiscordNode;
      select: Discord.StringSelectMenuOptionBuilder;
      option: DiscordNode;
      modal: Discord.ActionRowData<Discord.ModalActionRowComponentData>;
      input: never;
    }
    interface IntrinsicProps {
      message: DiscordNodeReplacer<
        Discord.BaseMessageOptions,
        Discord.MessageSubElementKeys
      >;
      br: {};
      embed: Omit<Discord.EmbedData, "color" | "footer" | "timestamp"> & {
        color?: Discord.ColorResolvable;
        footer?: IntrinsicProps["footer"] | string;
      };
      footer: PartialOf<Discord.EmbedFooterData, "text">;
      field: PartialOf<Discord.EmbedField, "value" | "inline">;
      emoji: {
        emoji: Discord.Emoji | Discord.EmojiResolvable;
      };
      row: Partial<Discord.ActionRowComponentData>;
      button: Partial<Discord.ButtonComponent> & {
        emoji?: Discord.Emoji | string;
        onClick?: Discord.ButtonInteractionHandler;
      } & Listenable;
      select: Omit<Discord.BaseSelectMenuComponentData, "type"> & {
        type?: Discord.SelectType;
        onChange?: Discord.SelectMenuInteractionHandler;
        channelTypes?: Discord.ChannelType[];
      } & Listenable;
      option: Discord.SelectMenuComponentOptionData;
      modal: Omit<Discord.ModalComponentData, "type" | "components"> & {
        type?:
          | Discord.ComponentType.ActionRow
          | Discord.ComponentType.TextInput;
        customId: string;
        title: string;
        onSubmit?: Discord.ModalSubmitInteractionHandler;
      } & Listenable;
      input: Omit<Discord.TextInputComponentData, "type">;
    }
    interface Rendered {
      message: Discord.BaseMessageOptions & HasInternalTag<"message">;
      br: "\n";
      embed: Discord.EmbedBuilder;
      footer: Discord.EmbedFooterData;
      field: Discord.EmbedField;
      emoji: Discord.Emoji | Discord.EmojiResolvable;
      row: Discord.ActionRowBuilder;
      button: Discord.ButtonBuilder;
      select:
        | Discord.StringSelectMenuBuilder
        | Discord.RoleSelectMenuBuilder
        | Discord.UserSelectMenuBuilder
        | Discord.ChannelSelectMenuBuilder
        | Discord.MentionableSelectMenuBuilder;
      option: Discord.SelectMenuComponentOptionData;
      modal: Discord.ModalBuilder;
      input: Discord.TextInputBuilder;
    }
    type IntrinsicElement<T extends IntrinsicKeys> = Partial<
      HasChildren<ChildResolvable[T]>
    > &
      IntrinsicProps[T];
    type IntrinsicInternalElement<T extends IntrinsicKeys> =
      IntrinsicElement<T> & HasChildren<ChildResolvable[T]> & HasInternalTag<T>;
    type IntrinsicElements = {
      [T in IntrinsicKeys]: IntrinsicElement<T>;
    };
    type IntrinsicInternalElements = {
      [T in IntrinsicKeys]: IntrinsicInternalElement<T>;
    };
  }
}

declare module "discord.js" {
  export type SelectType =
    | Discord.ComponentType.RoleSelect
    | Discord.ComponentType.UserSelect
    | Discord.ComponentType.StringSelect
    | Discord.ComponentType.ChannelSelect
    | Discord.ComponentType.MentionableSelect;
  export type ButtonInteractionHandler = (
    interaction: Discord.ButtonInteraction,
    off: () => boolean
  ) => void;
  export type SelectMenuInteractionHandler = (
    interaction: Discord.AnySelectMenuInteraction,
    off: () => boolean
  ) => void;
  export type ModalSubmitInteractionHandler = (
    interaction: Discord.ModalSubmitInteraction
  ) => void;
  interface PartialTextBasedChannelFields<InGuild extends boolean = boolean> {
    send(
      options: JSX.Element | JSX.IntrinsicProps["message"]
    ): Promise<Message<InGuild>>;
  }

  type MessageSubElementKeys = "embeds" | "components";
  type ElementMessageReplyOptions = JSX.DiscordNodeReplacer<
    MessageReplyOptions,
    MessageSubElementKeys
  >;
  type ElementInteractionReplyOptions = JSX.DiscordNodeReplacer<
    Discord.InteractionReplyOptions,
    MessageSubElementKeys
  >;
  type ElementInteractionEditReplyOptions = JSX.DiscordNodeReplacer<
    Discord.InteractionEditReplyOptions,
    MessageSubElementKeys
  >;
  type ElementInteractionUpdateOptions = JSX.DiscordNodeReplacer<
    Discord.InteractionUpdateOptions,
    MessageSubElementKeys
  >;
  interface Message<InGuild extends boolean = boolean> {
    reply(
      options:
        | JSX.Element
        | string
        | MessagePayload
        | ElementMessageReplyOptions
    ): Promise<OmitPartialGroupDMChannel<Message<InGuild>>>;
  }
  interface CommandInteraction<Cached extends CacheType = CacheType> {
    reply(
      options: JSX.Element | ElementInteractionReplyOptions
    ): Promise<Message<BooleanCache<Cached>>>;
    editReply(
      options: JSX.Element | ElementInteractionEditReplyOptions
    ): Promise<Message<BooleanCache<Cached>>>;
    showModal(modal: JSX.Element): Promise<Message<BooleanCache<Cached>>>;
  }
  interface MessageComponentInteraction<Cached extends CacheType = CacheType> {
    reply(
      options: JSX.Element | ElementInteractionReplyOptions
    ): Promise<Message<BooleanCache<Cached>>>;
    editReply(
      options: JSX.Element | ElementInteractionEditReplyOptions
    ): Promise<Message<BooleanCache<Cached>>>;
    showModal(modal: JSX.Element): Promise<Message<BooleanCache<Cached>>>;
    update(
      options: ElementInteractionUpdateOptions
    ): Promise<Message<BooleanCache<Cached>>>;
  }
  interface ModalSubmitInteraction<Cached extends CacheType = CacheType> {
    reply(
      options: JSX.Element | ElementInteractionReplyOptions
    ): Promise<Message<BooleanCache<Cached>>>;
    editReply(
      options: JSX.Element | ElementInteractionEditReplyOptions
    ): Promise<Message<BooleanCache<Cached>>>;
  }
}
