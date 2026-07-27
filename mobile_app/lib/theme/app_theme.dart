import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Ultra-Clean, High-Contrast Vibrant Light Theme
  static const Color background = Color(0xFFF4F6F8);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color primaryAction = Color(0xFF2E7D32); // Darker, rich green for better contrast and legibility
  static const Color secondaryAccent = Color(0xFFFF8F00); // Vibrant Amber
  static const Color textDark = Color(0xFF111827); // Near black for maximum readability
  static const Color textLight = Color(0xFF6B7280); // Cool gray

  static ThemeData get lightTheme {
    return ThemeData(
      scaffoldBackgroundColor: background,
      primaryColor: primaryAction,
      colorScheme: const ColorScheme.light(
        primary: primaryAction,
        secondary: secondaryAccent,
        surface: surface,
      ),
      // Switching to Inter for maximum readability for all ages
      textTheme: GoogleFonts.interTextTheme().copyWith(
        displayLarge: GoogleFonts.inter(color: textDark, fontWeight: FontWeight.w800),
        titleLarge: GoogleFonts.inter(color: textDark, fontWeight: FontWeight.w700),
        titleMedium: GoogleFonts.inter(color: textDark, fontWeight: FontWeight.w700),
        bodyLarge: GoogleFonts.inter(color: textDark, fontWeight: FontWeight.w500),
        bodyMedium: GoogleFonts.inter(color: textLight, fontWeight: FontWeight.w500),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent, // Making it transparent for glassmorphism
        elevation: 0,
        iconTheme: const IconThemeData(color: textDark),
        titleTextStyle: GoogleFonts.inter(
          color: textDark,
          fontSize: 24,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.5,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryAction,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: 0.5),
        )
      ),
    );
  }

  // Modern crisp shadow for cards
  static List<BoxShadow> get modernShadow {
    return [
      BoxShadow(
        color: const Color(0xFF000000).withValues(alpha: 0.04),
        blurRadius: 24,
        offset: const Offset(0, 12),
      ),
      BoxShadow(
        color: const Color(0xFF000000).withValues(alpha: 0.02),
        blurRadius: 8,
        offset: const Offset(0, 4),
      ),
    ];
  }
}
