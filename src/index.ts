import * as Discord from "discord.js";
import { PartialOf } from "./utils";
import { Wrapper, wrap } from "./wrapper";

type StateSetter<S> = (
  state: S,
  interaction?: Discord.ButtonInteraction | Discord.SelectMenuInteraction
) => void;
type StateTuple<S> = [Discord.Message, StateSetter<S>];
type PropsWithChildren<P = {}> = P & { children?: JSX.Element[] };
interface Listenable {
  readonly once?: boolean;
}
export class Listener implements Listenable {
  public readonly once?: boolean;
  public readonly listener: Function;
  public readonly type: InteractionType;
  constructor(listener: Function, type: InteractionType, once?: boolean) {
    this.listener = listener;
    this.type = type;
    this.once = once;
  }
}

export enum InteractionType {
  Button,
  SelectMenu,
  Modal,
}
export type DiscordFragment = Iterable<DiscordNode>;
export type DiscordNode = string | number | DiscordFragment;
export interface DiscordBaseElement<T extends keyof JSX.IntrinsicProps> {
  readonly children?: JSX.ChildrenResolvable[T];
}
interface DiscordInternalElement<T extends keyof JSX.IntrinsicProps>
  extends DiscordBaseElement<T> {
  _tag: T;
  readonly children: JSX.ChildrenResolvable[T];
}
export class Component<P = PropsWithChildren, S extends {} = {}> {
  public readonly props: P;
  public state: S;
  private _message?: Discord.Message;
  private deleteMessage?: Discord.Message["delete"];
  public set message(value: Discord.Message | undefined) {
    if (!value) return;
    this._message = value;
    this.deleteMessage = this._message.delete;
    this._message.delete = async () => {
      this.componentWillUnmount?.();
      return await this.deleteMessage!.call(this._message);
    };
  }
  public get message(): Discord.Message | undefined {
    return this._message;
  }
  public constructor(props: Readonly<P> | P) {
    this.props = props;
    this.state = {} as S;
  }
  public componentDidMount?(): void | Promise<void>;
  public componentDidUpdate?(prevState: Readonly<S>): void | Promise<void>;
  public componentWillUnmount?(): void;
  public componentDidCatch?(error: any): void;
  public shouldComponentUpdate(nextState: Readonly<S>): boolean {
    return true;
  }
  public render(): any {
    throw new Error("Your component doesn't have 'render' method.");
  }
  public setState: StateSetter<S> = (state, interaction) => {
    const prevState = { ...this.state };
    const shouldComponentUpdate = this.shouldComponentUpdate({
      ...this.state,
      ...state,
    });
    Object.assign(this.state, state);
    if (shouldComponentUpdate) {
      const rendered = renderAndCatch(this);
      if (rendered instanceof Error) throw rendered;
      if (rendered === undefined) return;
      if (interaction) interaction.update(rendered);
      else this.message?.edit(rendered);
      this.componentDidUpdate?.(prevState);
    }
  };
  public forceUpdate() {
    const rendered = renderAndCatch(this);
    if (rendered instanceof Error) throw rendered;
    if (rendered === undefined) return;
    if (rendered) this.message?.edit(rendered);
  }
}
function getSender(
  target: Discord.BaseChannel | Discord.BaseInteraction | Discord.Message
) {
  if (target instanceof Discord.BaseChannel && target.isTextBased())
    return (rendered: any) => target.send(rendered);
  if (target instanceof Discord.BaseInteraction && target.isRepliable())
    return target.reply.bind(target);
  if (target instanceof Discord.Message) return target.edit.bind(target);
  throw new Error("Failed to get sender from target.");
}
export function render(
  element: unknown,
  container: Discord.BaseChannel | Discord.BaseInteraction | Discord.Message
) {
  if (element instanceof Component) {
    const rendered = renderAndCatch(element);
    if (rendered instanceof Error) throw rendered;
    if (rendered === undefined) throw new Error("Failed to render element.");
    return getSender(container)(rendered);
  }
  return getSender(container)(element as any);
}
function renderAndCatch(component: Component<any, any>) {
  try {
    return component.render();
  } catch (e) {
    if (component.componentDidCatch) component.componentDidCatch(e);
    else return e;
  }
}
interface FunctionComponent<P = {}> {
  (props: PropsWithChildren<P>): JSX.Element;
}
export type FC<P = {}> = FunctionComponent<P>;

export type ButtonInteractionHandler = (
  interaction: Discord.ButtonInteraction,
  off: () => boolean
) => any;
export type SelectMenuInteractionHandler = (
  interaction: Discord.SelectMenuInteraction,
  off: () => boolean
) => any;
export type ModalSubmitInteractionHandler = (
  interaction: Discord.ModalSubmitInteraction
) => any;

declare global {
  namespace JSX {
    type Element = any;
    interface ChildrenResolvable {
      message: never;
      br: never;
      embed: Discord.APIEmbedField[] | DiscordNode;
      footer: DiscordNode;
      field: DiscordNode;
      emoji: never;
      row: (Discord.ButtonBuilder | Discord.BaseSelectMenuBuilder<any>)[];
      button: DiscordNode;
      select: Discord.SelectMenuOptionBuilder[];
      option: DiscordNode;
      modal: Discord.ActionRowData<Discord.ModalActionRowComponentData>[];
      input: never;
    }
    interface IntrinsicProps {
      message: Discord.BaseMessageOptions;
      br: {};
      embed: Omit<Discord.EmbedData, "color" | "footer" | "timestamp"> & {
        color?: Discord.ColorResolvable;
        footer?: IntrinsicProps["footer"];
      };
      footer: PartialOf<Discord.EmbedFooterData, "text"> | string;
      field: PartialOf<Discord.EmbedField, "value" | "inline">;
      emoji: {
        emoji: Discord.Emoji | Discord.EmojiResolvable;
      };
      row: Partial<Discord.ActionRowComponentData>;
      button: Partial<Discord.ButtonComponent> & {
        emoji?: Discord.Emoji | string;
        onClick?: ButtonInteractionHandler;
      } & Listenable;
      select: Omit<Discord.BaseSelectMenuComponentData, "type"> & {
        type?: Discord.SelectType;
        onChange?: SelectMenuInteractionHandler;
        channelTypes?: Discord.ChannelType[];
      } & Listenable;
      option: Discord.APISelectMenuOption;
      modal: Omit<Discord.ModalData, "type" | "components"> & {
        type?:
          | Discord.ComponentType.ActionRow
          | Discord.ComponentType.TextInput;
        customId: string;
        title: string;
        onSubmit?: ModalSubmitInteractionHandler;
      } & Listenable;
      input: Omit<Discord.TextInputComponentData, "type">;
    }
    type IntrinsicElements = {
      [T in keyof JSX.IntrinsicProps]: DiscordBaseElement<T> &
        JSX.IntrinsicProps[T];
    };
    type IntrinsicInternalElements = {
      [T in keyof JSX.IntrinsicProps]: DiscordInternalElement<T> &
        JSX.IntrinsicProps[T];
    };
  }
}
type DTSXComponent = Component;
declare module "discord.js" {
  export type SelectType =
    | Discord.ComponentType.RoleSelect
    | Discord.ComponentType.UserSelect
    | Discord.ComponentType.StringSelect
    | Discord.ComponentType.ChannelSelect
    | Discord.ComponentType.MentionableSelect;
  interface PartialTextBasedChannelFields<InGuild extends boolean = boolean> {
    send(options: DTSXComponent): Promise<Message<InGuild>>;
  }
  interface CommandInteraction<Cached extends CacheType = CacheType> {
    reply(options: DTSXComponent): Promise<Message<BooleanCache<Cached>>>;
  }
  interface MessageComponentInteraction<Cached extends CacheType = CacheType> {
    reply(options: DTSXComponent): Promise<Message<BooleanCache<Cached>>>;
  }
  interface ModalSubmitInteraction<Cached extends CacheType = CacheType> {
    reply(options: DTSXComponent): Promise<Message<BooleanCache<Cached>>>;
  }
}

const interactionListeners = new Map<string, Listener>();
function ElementBuilder(
  props: Exclude<
    JSX.IntrinsicInternalElements[keyof JSX.IntrinsicInternalElements],
    string
  >
) {
  let element: JSX.Element | undefined;
  if (props && props._tag)
    switch (props._tag) {
      case "message":
        element = props;
        break;
      case "br":
        element = "\n";
        break;
      case "embed":
        {
          props.fields = [];
          if (!props.description) {
            props.description = "";
            if (props.children instanceof Array)
              for (const child of props.children.flat(Infinity))
                if (typeof child === "object" && "name" in child)
                  props.fields.push(child);
                else props.description += String(child);
            else props.description = String(props.children);
          }
          element = new Discord.EmbedBuilder({
            ...props,
            footer:
              typeof props.footer === "string"
                ? { text: props.footer }
                : (props.footer as Discord.EmbedFooterOptions),
            color: undefined,
          }).setColor(props.color || null);
        }
        break;
      case "footer":
        element =
          typeof props.children === "object"
            ? {
                ...props,
                text: props.text || Array.from(props.children).join(""),
              }
            : { text: props.children };
        break;
      case "field":
        element = {
          name: props.name,
          value:
            props.value ||
            (typeof props.children === "object"
              ? Array.from(props.children).flat(Infinity).join("")
              : props.children),
          inline: props.inline,
        };
        break;
      case "emoji":
        element = props.emoji;
        break;
      case "row":
        element = new Discord.ActionRowBuilder({
          ...props,
          components: props.children.flat(Infinity),
        });
        break;
      case "button":
        {
          element = new Discord.ButtonBuilder({
            custom_id: props.customId || undefined,
            disabled: props.disabled || undefined,
            emoji: props.emoji,
            label:
              props.label ||
              (typeof props.children === "object"
                ? Array.from(props.children).flat(Infinity).join("")
                : String(props.children)),
          }).setStyle(
            props.style ||
              (props.url
                ? Discord.ButtonStyle.Link
                : Discord.ButtonStyle.Primary)
          );
          if (props.onClick) {
            if (!props.customId)
              throw new Error(
                "Button which has not url property must have a customId."
              );
            if (props.url)
              throw new Error("You can't use both customId/onClick and url.");
            interactionListeners.set(
              props.customId,
              new Listener(props.onClick, InteractionType.Button, props.once)
            );
          }
          if (props.url) element.setURL(props.url);
        }
        break;
      case "select":
        {
          if (props.onChange && props.customId)
            interactionListeners.set(
              props.customId,
              new Listener(
                props.onChange,
                InteractionType.SelectMenu,
                props.once
              )
            );
          element =
            !props.type || props.type === Discord.ComponentType.StringSelect
              ? new Discord.StringSelectMenuBuilder({
                  ...props,
                  type: Discord.ComponentType.StringSelect,
                }).addOptions(props.children.flat(Infinity))
              : props.type === Discord.ComponentType.ChannelSelect
              ? new Discord.ChannelSelectMenuBuilder({
                  ...props,
                  type: Discord.ComponentType.ChannelSelect,
                }).setChannelTypes(props.channelTypes || [])
              : new Discord.BaseSelectMenuBuilder({
                  ...props,
                  custom_id: props.customId, // I think this is discord.js' mistake.
                });
        }
        break;
      case "option":
        element = new Discord.StringSelectMenuOptionBuilder(props);
        break;
      case "modal":
        {
          if (props.onSubmit)
            interactionListeners.set(
              props.customId,
              new Listener(props.onSubmit, InteractionType.Modal, props.once)
            );
          element = new Discord.ModalBuilder({
            customId: props.customId,
            title: props.title,
            components: props.children.flat(Infinity),
          });
        }
        break;
      case "input":
        element = new Discord.TextInputBuilder({ ...props, type: 4 });
        break;
    }
  return element; // return undefined if 'props' is not resolvable.
}
export function createElement(
  tag: keyof JSX.IntrinsicProps | Function,
  props: any,
  ...children: any[]
): JSX.Element {
  if (!props || !props.children) props = { ...props, children };
  if (typeof tag === "function") {
    if (
      tag.prototype && // filter arrow function
      "render" in tag.prototype // renderable component
    ) {
      const constructed = Reflect.construct(tag, [props]);
      const rendered = renderAndCatch(constructed);
      if (rendered instanceof Error) throw rendered;
      if (rendered === undefined)
        throw new Error("An error occurred while rendering message.");
      return rendered._tag === "message" ? constructed : rendered;
    }
    return tag(props);
  }
  return ElementBuilder({ ...props, _tag: tag });
}
export const Fragment = (props: PropsWithChildren): DiscordFragment =>
  props.children || [];
export const getListener = interactionListeners.get.bind(interactionListeners);
export const setListener = interactionListeners.set.bind(interactionListeners);
export const deleteListener =
  interactionListeners.delete.bind(interactionListeners);

export class Client extends Discord.Client {
  private _once: InteractionType[] = [InteractionType.Modal];
  public readonly defaultInteractionCreateListener = (
    interaction: Discord.Interaction
  ) => {
    if ("customId" in interaction) {
      const interactionListener = interactionListeners.get(
        interaction.customId
      );
      if (!interactionListener) return;
      interactionListener.listener(interaction, () =>
        interactionListeners.delete(interaction.customId)
      );
      if (
        (this._once.includes(interactionListener.type) &&
          interactionListener.once !== false) ||
        interactionListener.once
      )
        interactionListeners.delete(interaction.customId);
    }
  };
  public constructor(
    options: Discord.ClientOptions & { once?: InteractionType[] }
  ) {
    super(options);

    this.on("interactionCreate", this.defaultInteractionCreateListener);
    if (options.once) this._once = [...this._once, ...options.once];
  }
}

const Wrapper: Wrapper = (original) =>
  function (this: any, options: any) {
    if (options instanceof Component) return render(options, this);
    return original.call(this, options);
  };

wrap(Discord.TextChannel.prototype, "send", Wrapper);
wrap(Discord.DMChannel.prototype, "send", Wrapper);
wrap(Discord.NewsChannel.prototype, "send", Wrapper);
wrap(Discord.StageChannel.prototype, "send", Wrapper);
wrap(Discord.VoiceChannel.prototype, "send", Wrapper);

wrap(Discord.CommandInteraction.prototype, "reply", Wrapper);
wrap(Discord.MessageComponentInteraction.prototype, "reply", Wrapper);
wrap(Discord.ModalSubmitInteraction.prototype, "reply", Wrapper);
