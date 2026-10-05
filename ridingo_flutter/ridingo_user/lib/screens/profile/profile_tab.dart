import 'dart:convert';
import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../models/user_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';

class ProfileTab extends ConsumerWidget {
  const ProfileTab({super.key});

  Future<void> _pickAvatar(BuildContext context, WidgetRef ref, UserModel user) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 75);
    if (picked != null) {
      final bytes = await File(picked.path).readAsBytes();
      final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';
      final updated = user.copyWith(avatar: base64Image);
      await ref.read(authProvider.notifier).updateUser(updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile photo updated!'), backgroundColor: AppColors.success),
      );
    }
  }

  void _openEditProfileSheet(BuildContext context, WidgetRef ref, UserModel user) {
    final nameCtrl = TextEditingController(text: user.name);
    final emailCtrl = TextEditingController(text: user.email);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        final bottomInset = MediaQuery.of(ctx).viewInsets.bottom;
        return Container(
          padding: EdgeInsets.fromLTRB(24, 20, 24, 20 + bottomInset),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Edit Profile Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
              const SizedBox(height: 16),
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Full Name',
                  filled: true,
                  fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailCtrl,
                decoration: InputDecoration(
                  labelText: 'Email Address',
                  filled: true,
                  fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    final updated = user.copyWith(
                      name: nameCtrl.text.trim(),
                      email: emailCtrl.text.trim(),
                    );
                    await ref.read(authProvider.notifier).updateUser(updated);
                    Navigator.pop(ctx);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.yellow,
                    foregroundColor: AppColors.onYellow,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _openLogoutSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(CupertinoIcons.square_arrow_right, size: 40, color: AppColors.danger),
              const SizedBox(height: 14),
              Text('Log Out of Ridingo?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
              const SizedBox(height: 8),
              Text(
                'Your session will be securely closed. Your trips, settings, and wallet balance are safely stored.',
                textAlign: TextAlign.center,
                style: TextStyle(color: isDark ? AppColors.mutedDark : AppColors.mutedLight, fontSize: 13),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await ref.read(authProvider.notifier).logout();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.danger,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).value;
    final currentTheme = ref.watch(themeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            Text(
              'Profile',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight),
            ),
            const SizedBox(height: 18),

            // Avatar & Profile Center Card
            Center(
              child: Column(
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 46,
                        backgroundColor: AppColors.yellow,
                        backgroundImage: user.avatar != null && user.avatar!.startsWith('data:image')
                            ? MemoryImage(base64Decode(user.avatar!.split(',').last))
                            : null,
                        child: user.avatar == null
                            ? Text(
                                user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                                style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: AppColors.onYellow),
                              )
                            : null,
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: InkWell(
                          onTap: () => _pickAvatar(context, ref, user),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: AppColors.onYellow,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(CupertinoIcons.camera_fill, color: Colors.white, size: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(user.name, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                      const SizedBox(width: 6),
                      InkWell(
                        onTap: () => _openEditProfileSheet(context, ref, user),
                        child: Icon(CupertinoIcons.pencil, size: 16, color: isDark ? AppColors.mutedDark : AppColors.mutedLight),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${user.phone} · ${user.email}', style: TextStyle(color: isDark ? AppColors.mutedDark : AppColors.mutedLight, fontSize: 13)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Vehicle Plate Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.yellow.withOpacity(0.18), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(CupertinoIcons.car_fill, color: AppColors.yellow, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user.car['model'] ?? 'Hyundai Creta', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          const SizedBox(height: 2),
                          Text(user.car['plate'] ?? 'KL 07 AB 4821', style: TextStyle(fontSize: 13, color: isDark ? AppColors.mutedDark : AppColors.mutedLight, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.green.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                      child: const Text('Verified Car', style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Settings Section
            Text('Security & Ride Preferences', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
            const SizedBox(height: 10),

            _settingsTile(
              CupertinoIcons.shield_fill,
              'Emergency SOS Contacts',
              '${user.sosContacts.length} trusted contacts active',
              () {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Emergency SOS: Trusted contacts are notified instantly during alerts.')));
              },
              isDark,
            ),
            _settingsTile(
              CupertinoIcons.doc_text_fill,
              'Trip Insurance Policy',
              'Tier: ${user.insuranceTier.toUpperCase()} · Nominee: ${user.nominee['name'] ?? 'Not set'}',
              () {},
              isDark,
            ),
            _settingsTile(
              CupertinoIcons.snow,
              'Ride AC & Cabin Comfort',
              'Pref: ${user.acTemp} (${user.acMode})',
              () {},
              isDark,
            ),
            _settingsTile(
              CupertinoIcons.lock_fill,
              'Secret Start PIN',
              'PIN code: ${user.pinCode}',
              () {},
              isDark,
            ),
            const SizedBox(height: 20),

            // App Theme Selector
            Text('Appearance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Light'),
                    selected: currentTheme == ThemeMode.light,
                    onSelected: (_) => ref.read(themeProvider.notifier).setTheme(ThemeMode.light),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Dark'),
                    selected: currentTheme == ThemeMode.dark,
                    onSelected: (_) => ref.read(themeProvider.notifier).setTheme(ThemeMode.dark),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Text('System'),
                    selected: currentTheme == ThemeMode.system,
                    onSelected: (_) => ref.read(themeProvider.notifier).setTheme(ThemeMode.system),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),

            // Logout Button
            SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () => _openLogoutSheet(context, ref),
                icon: const Icon(CupertinoIcons.square_arrow_right, color: AppColors.danger, size: 18),
                label: const Text('Log Out', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.danger),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _settingsTile(IconData icon, String title, String subtitle, VoidCallback onTap, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon, color: AppColors.yellow, size: 22),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
        trailing: const Icon(CupertinoIcons.chevron_right, size: 14),
      ),
    );
  }
}
