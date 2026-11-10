/**
 * Unicode emoji rendered by the platform font (Apple Color Emoji, Noto, and so on).
 * Talkentry does not ship drawn emoji art.
 */
export type EmojiCategory = {
  /** Stable category id. */
  readonly id: string;
  /** Glyph shown on the category tab. */
  readonly icon: string;
  /** Emoji inserted into the draft when tapped. */
  readonly emojis: readonly string[];
};

const glyphs = (value: string): readonly string[] =>
  value.split(' ').filter((item) => item.length > 0);

export const emojiCategories: readonly EmojiCategory[] = [
  {
    id: 'smileys',
    icon: '😀',
    emojis: glyphs(
      '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖',
    ),
  },
  {
    id: 'gestures',
    icon: '👍',
    emojis: glyphs(
      '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 👏 🙌 👐 🤲 🙏 ✍️ 💪 🦾 🦵 🦶 👂 👃 🧠 👀 👁️ 👅 👄 💋 💅',
    ),
  },
  {
    id: 'hearts',
    icon: '❤️',
    emojis: glyphs(
      '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 😻 💌 💐 🌹 🌺 🌸 💮 🌻 🌼 🌷',
    ),
  },
  {
    id: 'animals',
    icon: '🐻',
    emojis: glyphs(
      '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦏 🦛 🐪 🦒 🦘 🐄',
    ),
  },
  {
    id: 'food',
    icon: '🍔',
    emojis: glyphs(
      '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥔 🥕 🌽 🌶️ 🥒 🥬 🥦 🧄 🧅 🍄 🥜 🌰 🍞 🥐 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🥙 🧆 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 ☕ 🍵 🧃 🥤 🍺 🍻 🥂 🍷',
    ),
  },
  {
    id: 'activities',
    icon: '⚽️',
    emojis: glyphs(
      '⚽️ 🏀 🏈 ⚾️ 🥎 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🏑 🥍 🏏 🥅 ⛳️ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚴 🚵 🎪 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🕹️',
    ),
  },
  {
    id: 'travel',
    icon: '🚗',
    emojis: glyphs(
      '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🚲 🛴 🚨 ✈️ 🛫 🛬 🚀 🛸 🚁 🛶 ⛵️ 🚤 🛳️ ⛴️ 🚢 ⚓ 🚧 ⛽️ 🚏 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ 🏠 🏡 🏢 🏬 🏥 🏦 🏨 🏩 🏪 🏫 🏭',
    ),
  },
  {
    id: 'objects',
    icon: '💡',
    emojis: glyphs(
      '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💽 💾 💿 📷 📸 📹 🎥 📞 ☎️ 📺 📻 🧭 ⏰ ⏳ 💡 🔦 🕯️ 💵 💴 💶 💷 💰 💳 💎 ⚖️ 🔧 🔨 ⚒️ 🛠️ ⛏️ 🔩 ⚙️ 🔫 💣 🔪 🛡️ 🚬 ⚰️ ⚱️ 🔮 📿 💈 ⚗️ 🔭 🔬 💊 💉 🩸 🧬 🦠 🧴 🧼 🧽 🔑 🗝️ 🚪 🪑 🛏️ 🧸 🖼️ 🛍️ 🎁 🎈 🎉 🎊 📧 📦',
    ),
  },
  {
    id: 'symbols',
    icon: '✅',
    emojis: glyphs(
      '✅ ❌ ⭕ ❗ ❓ ‼️ ⁉️ 💯 🔥 ✨ ⭐ 🌟 💫 ⚡ 💥 💢 💦 💨 🕳️ 💬 👁️‍🗨️ 🗯️ 💭 🔔 🔕 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ▶️ ⏸️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ 🔀 🔁 🔂 ➕ ➖ ➗ ✖️ ♾️ ©️ ®️ ™️',
    ),
  },
];
