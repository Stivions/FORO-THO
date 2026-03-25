import { MessageSquare, Code, Gamepad2, BookOpen, Globe, Music, Camera, Briefcase } from 'lucide-react'

export const CATEGORIES = [
  { id: 'general',   name: 'General',   icon: MessageSquare },
  { id: 'tech',      name: 'Tech',      icon: Code },
  { id: 'gaming',    name: 'Gaming',    icon: Gamepad2 },
  { id: 'recursos',  name: 'Recursos',  icon: BookOpen },
  { id: 'mundo',     name: 'Mundo',     icon: Globe },
  { id: 'musica',    name: 'Música',    icon: Music },
  { id: 'foto',      name: 'Fotografía',icon: Camera },
  { id: 'trabajo',   name: 'Trabajo',   icon: Briefcase },
] as const

export type CategoryName = typeof CATEGORIES[number]['name']
