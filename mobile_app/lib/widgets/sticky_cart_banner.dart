import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../providers/cart_provider.dart';

class StickyCartBanner extends ConsumerWidget {
  const StickyCartBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartItems = ref.watch(cartProvider);

    if (cartItems.isEmpty) {
      return const SizedBox.shrink();
    }

    final totalItems = cartItems.length;

    return Center(
      child: GestureDetector(
        onTap: () => context.go('/cart'),
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: AppTheme.primaryAction,
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryAction.withValues(alpha: 0.3),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Text(
                '$totalItems Item${totalItems > 1 ? 's' : ''} in Inquiry',
                style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
              ),
              const SizedBox(width: 16),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Colors.white24,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 10),
              )
            ],
          ),
        ),
      ),
    );
  }
}
