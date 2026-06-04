import { 
  Briefcase, User, GraduationCap, HeartPulse, ShoppingBag, Coins, Folder,
  Heart, Smile, Sparkles, BookOpen, Clock, Flame, Bell, Calendar,
  TrendingUp, Compass, Coffee, Target, Music, Globe, Gamepad, CheckSquare,
  Gift, Trophy, Map, Layout, Zap, Award, Star, Settings, Shield, Key
} from 'lucide-react';
import React from 'react';
import { CustomCategory } from '../types';

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Briefcase,
  User,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
  Coins,
  Folder,
  Heart,
  Smile,
  Sparkles,
  BookOpen,
  Clock,
  Flame,
  Bell,
  Calendar,
  TrendingUp,
  Compass,
  Coffee,
  Target,
  Music,
  Globe,
  Gamepad,
  CheckSquare,
  Gift,
  Trophy,
  Map,
  Layout,
  Zap,
  Award,
  Star,
  Settings,
  Shield,
  Key
};

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'Work', name: 'Work', icon: 'Briefcase', color: '#1B4D3E', isDefault: true },
  { id: 'Personal', name: 'Personal', icon: 'User', color: '#1E3A8A', isDefault: true },
  { id: 'Education', name: 'Education', icon: 'GraduationCap', color: '#6D28D9', isDefault: true },
  { id: 'Health', name: 'Health', icon: 'HeartPulse', color: '#B91C1C', isDefault: true },
  { id: 'Shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#BE185D', isDefault: true },
  { id: 'Finance', name: 'Finance', icon: 'Coins', color: '#B45309', isDefault: true },
  { id: 'Other', name: 'Other', icon: 'Folder', color: '#4B5563', isDefault: true }
];
