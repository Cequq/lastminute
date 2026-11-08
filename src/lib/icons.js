import {
  Clapperboard, UtensilsCrossed, Scissors, Dumbbell, Sparkles, Mic, Puzzle, Tag,
  Music, Coffee, Bike, Gamepad2, Stethoscope, Car, BookOpen, Camera, BedDouble, Waves,
} from 'lucide-react';

// Ангиллын icon-ыг DB-д нэрээр нь хадгалж, энд компонент руу хөрвүүлнэ
export const CATEGORY_ICONS = {
  Clapperboard, UtensilsCrossed, Scissors, Dumbbell, Sparkles, Mic, Puzzle, Tag,
  Music, Coffee, Bike, Gamepad2, Stethoscope, Car, BookOpen, Camera, BedDouble, Waves,
};

export const iconFor = (name) => CATEGORY_ICONS[name] ?? Tag;
