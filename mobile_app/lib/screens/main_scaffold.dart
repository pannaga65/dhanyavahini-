import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;

  const MainScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final String location = GoRouterState.of(context).uri.toString();
    int currentIndex = 0;
    if (location == '/') currentIndex = 0;
    if (location.startsWith('/orders')) currentIndex = 1;
    if (location.startsWith('/profile')) currentIndex = 2;
    if (location.startsWith('/cart')) currentIndex = 3;

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppTheme.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 20,
              offset: const Offset(0, -5),
            )
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(context, icon: Icons.home_rounded, label: 'Home', isSelected: currentIndex == 0, route: '/'),
                _buildNavItem(context, icon: Icons.shopping_bag_rounded, label: 'Orders', isSelected: currentIndex == 1, route: '/orders'),
                _buildNavItem(context, icon: Icons.person_rounded, label: 'Profile', isSelected: currentIndex == 2, route: '/profile'),
                _buildNavItem(context, icon: Icons.shopping_cart_outlined, label: 'Cart', isSelected: currentIndex == 3, route: '/cart'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, {required IconData icon, required String label, required bool isSelected, required String route}) {
    return GestureDetector(
      onTap: () => context.go(route),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryAction.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(30),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? AppTheme.primaryAction : AppTheme.textLight,
              size: 28,
            ),
            if (isSelected) ...[
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: AppTheme.primaryAction,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
