import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import '../providers/notification_provider.dart';
import 'package:geolocator/geolocator.dart';
import '../main.dart';
import 'package:flutter_animate/flutter_animate.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  bool _locationGranted = false;
  bool _notificationGranted = false;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _requestLocation() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
      setState(() => _locationGranted = true);
    }
    _pageController.nextPage(duration: 400.ms, curve: Curves.easeInOut);
  }

  Future<void> _requestNotificationAndFinish() async {
    await requestAndSaveFCMToken();
    setState(() => _notificationGranted = true);
    
    // Mark Onboarding as seen
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasSeenOnboarding', true);
    
    // Update global state for GoRouter
    hasSeenOnboarding = true;

    if (mounted) {
      context.go('/');
    }
  }

  void _skipAndFinish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasSeenOnboarding', true);
    hasSeenOnboarding = true;
    if (mounted) {
      context.go('/');
    }
  }

  Widget _buildSlide({
    required IconData icon,
    required String title,
    required String description,
    required String buttonText,
    required VoidCallback onButtonPressed,
    required Color iconColor,
    required Color bgColor,
    bool isLast = false,
  }) {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Spacer(),
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: iconColor.withValues(alpha: 0.2),
                  blurRadius: 40,
                  offset: const Offset(0, 20),
                )
              ],
            ),
            child: Icon(icon, size: 80, color: iconColor),
          ).animate().scale(delay: 200.ms, duration: 500.ms, curve: Curves.easeOutBack),
          
          const SizedBox(height: 48),
          
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: AppTheme.textDark,
              letterSpacing: -0.5,
            ),
          ).animate().fade(delay: 300.ms).slideY(begin: 0.2),
          
          const SizedBox(height: 16),
          
          Text(
            description,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              color: AppTheme.textLight,
              height: 1.5,
            ),
          ).animate().fade(delay: 400.ms).slideY(begin: 0.2),
          
          const Spacer(),
          
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onButtonPressed,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryAction,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                buttonText,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ).animate().fade(delay: 500.ms),
          
          const SizedBox(height: 16),
          
          TextButton(
            onPressed: isLast ? _skipAndFinish : () => _pageController.nextPage(duration: 400.ms, curve: Curves.easeInOut),
            child: const Text(
              'Not Now',
              style: TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.w600),
            ),
          ).animate().fade(delay: 600.ms),
          
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Custom modern dot indicators
            Padding(
              padding: const EdgeInsets.only(top: 24.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(2, (index) {
                  final isActive = _currentPage == index;
                  return AnimatedContainer(
                    duration: 300.ms,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    height: 8,
                    width: isActive ? 24 : 8,
                    decoration: BoxDecoration(
                      color: isActive ? AppTheme.primaryAction : AppTheme.primaryAction.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                }),
              ),
            ),
            
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(), // Force using buttons to navigate
                onPageChanged: (index) => setState(() => _currentPage = index),
                children: [
                  _buildSlide(
                    icon: Icons.location_on_rounded,
                    title: 'Set Your Location',
                    description: 'We need your location to show accurate wholesale pricing and delivery availability for your specific region.',
                    buttonText: 'Enable Location',
                    onButtonPressed: _requestLocation,
                    iconColor: AppTheme.primaryAction,
                    bgColor: AppTheme.primaryAction.withValues(alpha: 0.1),
                  ),
                  _buildSlide(
                    icon: Icons.notifications_active_rounded,
                    title: 'Stay Updated',
                    description: 'Get real-time alerts about your order status, payment confirmations, and exclusive wholesale deals.',
                    buttonText: 'Allow Notifications',
                    onButtonPressed: _requestNotificationAndFinish,
                    iconColor: AppTheme.secondaryAccent,
                    bgColor: AppTheme.secondaryAccent.withValues(alpha: 0.15),
                    isLast: true,
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
