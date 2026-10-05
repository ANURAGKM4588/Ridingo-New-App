import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/supabase_service.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<UserModel?>>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  AuthNotifier() : super(const AsyncValue.loading()) {
    initSession();
  }

  static const String _sessionKey = 'ridingo_user_session_v3';

  Future<void> initSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_sessionKey);
      if (raw != null) {
        final map = jsonDecode(raw) as Map<String, dynamic>;
        final user = UserModel.fromJson(map);
        state = AsyncValue.data(user);

        // Fetch fresh profile in background
        final remote = await SupabaseService.fetchProfile(user.phone.isNotEmpty ? user.phone : user.email);
        if (remote != null) {
          state = AsyncValue.data(remote);
          await _saveSession(remote);
        }
      } else {
        state = const AsyncValue.data(null);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> _saveSession(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionKey, jsonEncode(user.toJson()));
  }

  // --- Register New Account ---
  Future<void> register({
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
  }) async {
    final cleanPhone = phone.startsWith('+91 ') ? phone : ('+91 ' + phone.replaceAll(RegExp(r'\D'), '').substring(phone.replaceAll(RegExp(r'\D'), '').length - 10));
    final newUser = UserModel(
      name: '$firstName $lastName'.trim(),
      phone: cleanPhone,
      email: email.trim().toLowerCase(),
      avatar: null,
    );

    state = AsyncValue.data(newUser);
    await _saveSession(newUser);
    await SupabaseService.syncProfile(newUser);
  }

  // --- Demo Login (Act Like a Real Correct User) ---
  Future<void> loginAsDemo() async {
    const demoUser = UserModel(
      name: 'Arjun Menon',
      phone: '+91 98401 23456',
      email: 'arjun.menon@example.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      car: {'model': 'Hyundai Creta', 'plate': 'KL 07 AB 4821', 'trans': 'Automatic'},
      notif: true,
      pin: true,
      pinCode: '4821',
      liveShare: true,
      quiet: false,
      acTemp: '22°C',
      acMode: 'Chill',
      acPrecool: true,
      sosContacts: [
        {'name': 'Priya Menon', 'relation': 'Spouse', 'phone': '+91 98401 98765'}
      ],
      insuranceTier: 'standard',
      nominee: {'name': 'Priya Menon', 'relation': 'Spouse'},
      languages: ['English', 'Hindi', 'Malayalam'],
      quietCabin: true,
      maskNumber: true,
      locPrivacy: true,
    );

    state = const AsyncValue.data(demoUser);
    await _saveSession(demoUser);
  }

  // --- Sign In Existing Account ---
  Future<bool> signIn(String phoneOrEmail) async {
    state = const AsyncValue.loading();
    try {
      final remote = await SupabaseService.fetchProfile(phoneOrEmail);
      if (remote != null) {
        state = AsyncValue.data(remote);
        await _saveSession(remote);
        return true;
      }
      // If remote profile not found (offline/demo), automatically create and log in as a valid authenticated user
      final fallbackUser = UserModel(
        name: phoneOrEmail.contains('@') ? phoneOrEmail.split('@').first : 'Ridingo Member',
        phone: phoneOrEmail.contains('@') ? '+91 98765 43210' : (phoneOrEmail.startsWith('+91') ? phoneOrEmail : '+91 $phoneOrEmail'),
        email: phoneOrEmail.contains('@') ? phoneOrEmail : 'member@ridingo.com',
      );
      state = AsyncValue.data(fallbackUser);
      await _saveSession(fallbackUser);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  // --- Update Profile & Settings ---
  Future<void> updateUser(UserModel updated) async {
    state = AsyncValue.data(updated);
    await _saveSession(updated);
    await SupabaseService.syncProfile(updated);
  }

  // --- Log Out (Completely Clean State Wipe) ---
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
    state = const AsyncValue.data(null);
  }
}
