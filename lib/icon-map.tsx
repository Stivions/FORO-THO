import {
  MessageSquare, Code, Gamepad2, BookOpen, Globe, Music, Camera, Briefcase,
  Star, Heart, Zap, Flame, Hash, Users, Coffee, Film, Newspaper, ShoppingBag,
  Cpu, Palette, type LucideIcon,
} from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  Code,
  Gamepad2,
  BookOpen,
  Globe,
  Music,
  Camera,
  Briefcase,
  Star,
  Heart,
  Zap,
  Flame,
  Hash,
  Users,
  Coffee,
  Film,
  Newspaper,
  ShoppingBag,
  Cpu,
  Palette,
}

export const ICON_OPTIONS = Object.keys(ICON_MAP)

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Hash
}
