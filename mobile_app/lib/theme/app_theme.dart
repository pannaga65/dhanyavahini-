import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Colors based on Levoro aesthetic
  static const Color background = Color(0xFFF8F9FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color primaryAction = Color(0xFF34C759); // Bright Green
  static const Color secondaryAccent = Color(0xFFFF9500); // Warm Amber
  static const Color textDark = Color(0xFF1C1C1E);
  static const Color textLight = Color(0xFF8E8E93);

  static ThemeData get lightTheme {
    return ThemeData(
      scaffoldBackgroundColor: background,
      primaryColor: primaryAction,
      colorScheme: const ColorScheme.light(
        primary: primaryAction,
        secondary: secondaryAccent,
        surface: surface,
      ),
      textTheme: GoogleFonts.poppinsTextTheme().copyWith(
        displayLarge: GoogleFonts.poppins(color: textDark, fontWeight: FontWeight.bold),
        titleLarge: GoogleFonts.poppins(color: textDark, fontWeight: FontWeight.w600),
        bodyLarge: GoogleFonts.poppins(color: textDark),
        bodyMedium: GoogleFonts.poppins(color: textLight),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        elevation: 0,
        iconTheme: const IconThemeData(color: textDark),
        titleTextStyle: GoogleFonts.poppins(
          color: textDark,
          fontSize: 24,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  // Helper for the 3D Soft Neumorphic Shadow
  static List<BoxShadow> get softShadow {
    return [
      BoxShadow(
        color: Colors.black.withOpacity(0.05),
        blurRadius: 20,
        offset: const Offset(0, 8),
      ),
    ];
  }
}
