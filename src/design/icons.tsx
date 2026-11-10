import React, { createContext, useContext } from "react";
import { Img } from "remotion";
import {
  Award, Baby, BookOpen, Brush, Building2, Cake, Calendar, Camera, Car, ChartColumn, Check, ChefHat, Clock, Coffee, Crown,
  Droplet, Dumbbell, Flame, Flower2, Gem, Gift, Globe, GraduationCap, Headset, Heart, House, Image, Laptop, Leaf, Lightbulb,
  MapPin, MessageCircle, Mic, Moon, Music, Palette, PawPrint, Percent, Phone, Pill, Pizza, Plane, Rocket, Scissors, ShieldCheck,
  Shirt, ShoppingBag, ShoppingCart, Smartphone, Smile, Sparkles, Star, Stethoscope, Sun, Tag, Target, TrendingUp, Trophy, Truck,
  User, Users, Utensils, Video, Wallet, Wifi, Zap, type LucideIcon,
} from "lucide-react";
import type { IconId } from "./spec";
export { ICON_EN } from "./icon-names";

export const ICONS: Record<IconId, { C: LucideIcon; label: string }> = {
  check: { C: Check, label: "صح" }, star: { C: Star, label: "نجمة" }, heart: { C: Heart, label: "قلب" }, sparkles: { C: Sparkles, label: "لمعة" },
  zap: { C: Zap, label: "سرعة" }, clock: { C: Clock, label: "وقت" }, calendar: { C: Calendar, label: "تاريخ" }, "map-pin": { C: MapPin, label: "موقع" },
  phone: { C: Phone, label: "هاتف" }, message: { C: MessageCircle, label: "رسالة" }, gift: { C: Gift, label: "هدية" }, bag: { C: ShoppingBag, label: "تسوق" },
  cart: { C: ShoppingCart, label: "سلة" }, tag: { C: Tag, label: "سعر" }, percent: { C: Percent, label: "خصم" }, trending: { C: TrendingUp, label: "نمو" },
  chart: { C: ChartColumn, label: "إحصاء" }, shield: { C: ShieldCheck, label: "ضمان" }, award: { C: Award, label: "جائزة" }, trophy: { C: Trophy, label: "كأس" },
  users: { C: Users, label: "ناس" }, user: { C: User, label: "شخص" }, graduation: { C: GraduationCap, label: "تعليم" }, book: { C: BookOpen, label: "كتاب" },
  lightbulb: { C: Lightbulb, label: "فكرة" }, target: { C: Target, label: "هدف" }, rocket: { C: Rocket, label: "انطلاق" }, camera: { C: Camera, label: "كاميرا" },
  image: { C: Image, label: "صورة" }, video: { C: Video, label: "فيديو" }, mic: { C: Mic, label: "مايك" }, music: { C: Music, label: "موسيقى" },
  coffee: { C: Coffee, label: "قهوة" }, utensils: { C: Utensils, label: "مطعم" }, chef: { C: ChefHat, label: "طبخ" }, pizza: { C: Pizza, label: "بيتزا" },
  cake: { C: Cake, label: "حلويات" }, leaf: { C: Leaf, label: "طبيعي" }, sun: { C: Sun, label: "شمس" }, moon: { C: Moon, label: "رمضان" },
  droplet: { C: Droplet, label: "قطرة" }, flame: { C: Flame, label: "حار" }, home: { C: House, label: "بيت" }, building: { C: Building2, label: "مبنى" },
  car: { C: Car, label: "سيارة" }, plane: { C: Plane, label: "سفر" }, truck: { C: Truck, label: "توصيل" }, scissors: { C: Scissors, label: "قص" },
  shirt: { C: Shirt, label: "ملابس" }, gem: { C: Gem, label: "فخامة" }, crown: { C: Crown, label: "تاج" }, smile: { C: Smile, label: "ابتسامة" },
  stethoscope: { C: Stethoscope, label: "طبي" }, pill: { C: Pill, label: "دواء" }, dumbbell: { C: Dumbbell, label: "رياضة" }, palette: { C: Palette, label: "ألوان" },
  brush: { C: Brush, label: "تجميل" }, laptop: { C: Laptop, label: "لابتوب" }, "phone-mobile": { C: Smartphone, label: "جوال" }, globe: { C: Globe, label: "موقع إلكتروني" },
  wifi: { C: Wifi, label: "إنترنت" }, baby: { C: Baby, label: "أطفال" }, paw: { C: PawPrint, label: "حيوانات" }, flower: { C: Flower2, label: "ورد" },
  wallet: { C: Wallet, label: "محفظة" }, headset: { C: Headset, label: "دعم" },
};

/** Colourful, "real" icons: the same ids drawn as colour emoji. */
export const EMOJI: Record<IconId, string> = {
  check: "✅", star: "⭐", heart: "❤️", sparkles: "✨", zap: "⚡", clock: "⏰", calendar: "📅", "map-pin": "📍", phone: "📞", message: "💬",
  gift: "🎁", bag: "🛍️", cart: "🛒", tag: "🏷️", percent: "💯", trending: "📈", chart: "📊", shield: "🛡️", award: "🏅", trophy: "🏆",
  users: "👥", user: "👤", graduation: "🎓", book: "📚", lightbulb: "💡", target: "🎯", rocket: "🚀", camera: "📸", image: "🖼️", video: "🎬",
  mic: "🎤", music: "🎵", coffee: "☕", utensils: "🍽️", chef: "👨‍🍳", pizza: "🍕", cake: "🍰", leaf: "🌿", sun: "☀️", moon: "🌙",
  droplet: "💧", flame: "🔥", home: "🏠", building: "🏢", car: "🚗", plane: "✈️", truck: "🚚", scissors: "✂️", shirt: "👗", gem: "💎",
  crown: "👑", smile: "😊", stethoscope: "🩺", pill: "💊", dumbbell: "🏋️", palette: "🎨", brush: "💅", laptop: "💻", "phone-mobile": "📱", globe: "🌐",
  wifi: "📶", baby: "👶", paw: "🐾", flower: "🌸", wallet: "👛", headset: "🎧",
};
export type IconStyle = "line" | "duo" | "emoji" | "3d";
export const ICON_STYLES: [IconStyle, string][] = [["line", "خطّية"], ["duo", "معبّاة"], ["emoji", "ملوّنة طبيعية"], ["3d", "3D احترافية"]];
export const IconStyleContext = createContext<{ style: IconStyle; images?: Record<string, string> }>({ style: "line" });
export const EMOJI_FONT = `"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

export function DIcon({ name, size, color, stroke = 1.8 }: { name?: string; size: number; color: string; stroke?: number }) {
  const { style, images } = useContext(IconStyleContext);
  const id = (name && name in ICONS ? name : "sparkles") as IconId;
  if (style === "3d" && images?.[id]) return <Img src={images[id]} style={{ width: size * 1.6, height: size * 1.6, objectFit: "contain", flex: "none", margin: -size * 0.3 }} />;
  if (style === "emoji") return <span style={{ fontSize: size * 0.92, lineHeight: 1, fontFamily: EMOJI_FONT, flex: "none", display: "inline-block", width: size, textAlign: "center" }}>{EMOJI[id]}</span>;
  const C = ICONS[id].C;
  return <C size={size} color={color} strokeWidth={stroke} absoluteStrokeWidth={false} fill={style === "duo" || style === "3d" ? color : "none"} fillOpacity={style === "duo" || style === "3d" ? 0.22 : undefined} style={{ flex: "none" }} />;
}
