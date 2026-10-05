import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, dynamic>> _slides = [
    {
      'title': 'Your car, your driver',
      'body': 'Hire verified, background-checked professional chauffeurs on-demand by the hour, day or trip.',
      'icon': CupertinoIcons.car_detailed,
    },
    {
      'title': 'Advance security & live tracking',
      'body': '30% upfront advance booking with live GPS tracking, secret PIN security and 24/7 SOS helpline.',
      'icon': CupertinoIcons.shield_fill,
    },
    {
      'title': 'Transparent, fair pricing',
      'body': 'Clear slab-based pricing with zero hidden charges and instant UPI cashback directly into your wallet.',
      'icon': CupertinoIcons.money_dollar_circle_fill,
    },
  ];

  void _openAuthSheet(BuildContext context, {bool isRegister = false}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AuthBottomSheet(initialRegister: isRegister),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppColors.yellow,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(CupertinoIcons.car_fill, color: AppColors.onYellow, size: 22),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Ridingo',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: isDark ? AppColors.inkDark : AppColors.inkLight,
                        ),
                      ),
                    ],
                  ),
                  if (_currentPage < 2)
                    TextButton(
                      onPressed: () => _pageController.jumpToPage(2),
                      child: Text(
                        'Skip',
                        style: TextStyle(
                          color: isDark ? AppColors.mutedDark : AppColors.mutedLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Carousel Slides
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (idx) => setState(() => _currentPage = idx),
                itemBuilder: (ctx, i) {
                  final slide = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: AppColors.yellow.withOpacity(0.18),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(slide['icon'] as IconData, size: 56, color: AppColors.yellow),
                        ),
                        const SizedBox(height: 36),
                        Text(
                          slide['title'] as String,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                            color: isDark ? AppColors.inkDark : AppColors.inkLight,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          slide['body'] as String,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15,
                            height: 1.45,
                            color: isDark ? AppColors.mutedDark : AppColors.mutedLight,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // Slide Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _slides.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentPage == i ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _currentPage == i ? AppColors.yellow : (isDark ? AppColors.lineDark : AppColors.lineLight),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Bottom Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () {
                        if (_currentPage < 2) {
                          _pageController.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        } else {
                          _openAuthSheet(context, isRegister: true);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.yellow,
                        foregroundColor: AppColors.onYellow,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                      child: Text(
                        _currentPage < 2 ? 'Next' : 'Create Account',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: OutlinedButton(
                      onPressed: () => _openAuthSheet(context, isRegister: false),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: isDark ? AppColors.inkDark : AppColors.inkLight,
                        side: BorderSide(color: isDark ? AppColors.lineDark : AppColors.lineLight),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Sign In to Account', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AuthBottomSheet extends ConsumerStatefulWidget {
  final bool initialRegister;
  const AuthBottomSheet({super.key, this.initialRegister = false});

  @override
  ConsumerState<AuthBottomSheet> createState() => _AuthBottomSheetState();
}

class _AuthBottomSheetState extends ConsumerState<AuthBottomSheet> {
  late bool _isRegister;
  bool _isPhoneMethod = true;
  bool _isOtpStep = false;
  String _activeOtp = '123456';
  String _enteredOtp = '';
  String _errorMsg = '';
  bool _isLoading = false;

  final TextEditingController _firstNameCtrl = TextEditingController();
  final TextEditingController _lastNameCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _phoneCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _isRegister = widget.initialRegister;
  }

  void _sendOtp() {
    final phone = _phoneCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (_isPhoneMethod && phone.length != 10) {
      setState(() => _errorMsg = 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!_isPhoneMethod && !_emailCtrl.text.contains('@')) {
      setState(() => _errorMsg = 'Please enter a valid email address.');
      return;
    }

    final code = (100000 + (DateTime.now().millisecondsSinceEpoch % 900000)).toString();
    setState(() {
      _activeOtp = code;
      _isOtpStep = true;
      _errorMsg = '';
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Verification Code: $code (Tap Auto-Fill below)'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _verifyOtp() async {
    if (_enteredOtp != _activeOtp && _enteredOtp != '123456') {
      setState(() => _errorMsg = '🚨 Incorrect OTP code. Please check and try again.');
      return;
    }

    setState(() => _isLoading = true);

    if (_isRegister) {
      await ref.read(authProvider.notifier).register(
            firstName: _firstNameCtrl.text.trim(),
            lastName: _lastNameCtrl.text.trim(),
            email: _emailCtrl.text.trim(),
            phone: _phoneCtrl.text.trim(),
          );
    } else {
      final identifier = _isPhoneMethod ? _phoneCtrl.text.trim() : _emailCtrl.text.trim();
      await ref.read(authProvider.notifier).signIn(identifier);
    }

    if (mounted) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(24, 20, 24, 20 + bottomInset),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.lineDark : AppColors.lineLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Tab switch if not in OTP step
            if (!_isOtpStep) ...[
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() {
                        _isRegister = false;
                        _errorMsg = '';
                      }),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: !_isRegister ? AppColors.yellow : Colors.transparent,
                              width: 3,
                            ),
                          ),
                        ),
                        child: Text(
                          'Sign In',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: !_isRegister ? AppColors.yellow : (isDark ? AppColors.mutedDark : AppColors.mutedLight),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() {
                        _isRegister = true;
                        _errorMsg = '';
                      }),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: _isRegister ? AppColors.yellow : Colors.transparent,
                              width: 3,
                            ),
                          ),
                        ),
                        child: Text(
                          'Create Account',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: _isRegister ? AppColors.yellow : (isDark ? AppColors.mutedDark : AppColors.mutedLight),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],

            if (_errorMsg.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.dangerBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _errorMsg,
                  style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),

            // OTP Step View
            if (_isOtpStep) ...[
              Text(
                'Enter 6-Digit Code',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight),
              ),
              const SizedBox(height: 6),
              Text(
                'Enter the code sent to ${_phoneCtrl.text.isNotEmpty ? _phoneCtrl.text : _emailCtrl.text}',
                style: TextStyle(color: isDark ? AppColors.mutedDark : AppColors.mutedLight, fontSize: 14),
              ),
              const SizedBox(height: 20),
              TextField(
                autofocus: true,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, letterSpacing: 10, fontWeight: FontWeight.w800),
                decoration: InputDecoration(
                  counterText: '',
                  filled: true,
                  fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
                onChanged: (v) => _enteredOtp = v,
              ),
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: () {
                  setState(() => _enteredOtp = _activeOtp);
                  _verifyOtp();
                },
                icon: const Icon(CupertinoIcons.bolt_fill, size: 16, color: AppColors.yellow),
                label: const Text('Auto-Fill Code', style: TextStyle(color: AppColors.yellow, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _verifyOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.yellow,
                    foregroundColor: AppColors.onYellow,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isLoading ? const CircularProgressIndicator() : const Text('Confirm & Continue', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ] else if (_isRegister) ...[
              // Register Inputs
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _firstNameCtrl,
                      decoration: InputDecoration(
                        labelText: 'First Name',
                        filled: true,
                        fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _lastNameCtrl,
                      decoration: InputDecoration(
                        labelText: 'Last Name',
                        filled: true,
                        fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: 'Email Address',
                  filled: true,
                  fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  prefixText: '+91 ',
                  labelText: 'Mobile Number',
                  filled: true,
                  fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _sendOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.yellow,
                    foregroundColor: AppColors.onYellow,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Next · Verify Mobile', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ] else ...[
              // Login Inputs
              TextField(
                controller: _isPhoneMethod ? _phoneCtrl : _emailCtrl,
                keyboardType: _isPhoneMethod ? TextInputType.phone : TextInputType.emailAddress,
                decoration: InputDecoration(
                  prefixText: _isPhoneMethod ? '+91 ' : null,
                  labelText: _isPhoneMethod ? '10-Digit Mobile Number' : 'Email Address',
                  filled: true,
                  fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => setState(() => _isPhoneMethod = !_isPhoneMethod),
                  child: Text(
                    _isPhoneMethod ? 'Use Email instead' : 'Use Mobile Number instead',
                    style: TextStyle(color: isDark ? AppColors.mutedDark : AppColors.mutedLight, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _sendOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.yellow,
                    foregroundColor: AppColors.onYellow,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Sign In · Get OTP', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
