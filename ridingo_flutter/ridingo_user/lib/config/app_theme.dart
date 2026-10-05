import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const Color yellow = Color(0xFFFFC70A);
  static const Color onYellow = Color(0xFF15140F);
  static const Color yellowSoftLight = Color(0xFFFFF3C4);
  static const Color yellowSoftDark = Color(0xFF2E2600);

  // Light Palette
  static const Color groundLight = Color(0xFFF2F2F7);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color fieldLight = Color(0xFFF2F2F7);
  static const Color inkLight = Color(0xFF0B0B0C);
  static const Color mutedLight = Color(0xFF68686E);
  static const Color lineLight = Color(0xFFE5E5EA);

  // Dark Palette
  static const Color groundDark = Color(0xFF0B0B0C);
  static const Color surfaceDark = Color(0xFF151518);
  static const Color cardDark = Color(0xFF1C1C20);
  static const Color fieldDark = Color(0xFF24242A);
  static const Color inkDark = Color(0xFFF4F4F6);
  static const Color mutedDark = Color(0xFF909099);
  static const Color lineDark = Color(0xFF2C2C32);

  // Feedback Colors
  static const Color success = Color(0xFF188252);
  static const Color successBg = Color(0xFFD7F0E2);
  static const Color danger = Color(0xFFB82626);
  static const Color dangerBg = Color(0xFFFFE5E5);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: AppColors.yellow,
      scaffoldBackgroundColor: AppColors.groundLight,
      colorScheme: const ColorScheme.light(
        primary: AppColors.yellow,
        onPrimary: AppColors.onYellow,
        surface: AppColors.surfaceLight,
        onSurface: AppColors.inkLight,
        outline: AppColors.lineLight,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme).apply(
        bodyColor: AppColors.inkLight,
        displayColor: AppColors.inkLight,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.inkLight),
      ),
      cardTheme: CardTheme(
        color: AppColors.cardLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.lineLight, width: 1),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: AppColors.yellow,
      scaffoldBackgroundColor: AppColors.groundDark,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.yellow,
        onPrimary: AppColors.onYellow,
        surface: AppColors.surfaceDark,
        onSurface: AppColors.inkDark,
        outline: AppColors.lineDark,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).apply(
        bodyColor: AppColors.inkDark,
        displayColor: AppColors.inkDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.inkDark),
      ),
      cardTheme: CardTheme(
        color: AppColors.cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.lineDark, width: 1),
        ),
      ),
    );
  }
}
