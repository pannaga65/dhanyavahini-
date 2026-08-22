import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../providers/cart_provider.dart';
import '../providers/product_provider.dart';
import '../widgets/sticky_cart_banner.dart';

class ProductDetailsScreen extends ConsumerStatefulWidget {
  final String productId;
  const ProductDetailsScreen({super.key, required this.productId});

  @override
  ConsumerState<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends ConsumerState<ProductDetailsScreen> {
  int quantity = 0;
  bool isInitialized = false;
  bool _justAdded = false;

  void _handleAddToCart(product) {
    ref.read(cartProvider.notifier).addItem(
      CartItem(
        productId: widget.productId,
        name: product.name,
        price: product.basePriceKg,
        quantity: quantity,
        moqKg: product.moqKg > 0 ? product.moqKg : 1,
        incrementStepKg: product.incrementStepKg,
        gstPercentage: product.gstPercentage,
        imageUrl: product.imageUrl,
      ),
    );

    setState(() => _justAdded = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _justAdded = false);
    });

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} added to cart'),
        backgroundColor: AppTheme.primaryAction,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        action: SnackBarAction(
          label: 'VIEW CART',
          textColor: Colors.white,
          onPressed: () => context.go('/cart'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(singleProductProvider(widget.productId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Product Details'),
      ),
      body: Stack(
        children: [
          productAsync.when(
            data: (product) {
          // Initialize quantity to MOQ once
          if (!isInitialized) {
            quantity = product.moqKg;
            isInitialized = true;
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 250,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: AppTheme.modernShadow,
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: product.imageUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: product.imageUrl,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => const Center(child: CircularProgressIndicator()),
                          errorWidget: (context, url, error) => const Center(child: Icon(Icons.inventory_2, size: 100, color: AppTheme.textLight)),
                        )
                      : const Center(
                          child: Icon(Icons.inventory_2, size: 100, color: AppTheme.textLight),
                        ),
                ),
                const SizedBox(height: 24),
                Text(product.name, style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 28)),
                const SizedBox(height: 8),
                Text(product.category, style: const TextStyle(color: AppTheme.primaryAction, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Text('Price available on inquiry', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textLight, fontSize: 16)),
                const SizedBox(height: 24),
                Text('Specifications', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                _buildSpecRow('Minimum Order (MOQ)', '${product.moqKg} Kg'),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error loading product: $error')),
          ),
          const Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: StickyCartBanner(),
            ),
          ),
        ],
      ),
      bottomNavigationBar: productAsync.whenOrNull(
        data: (product) => Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: AppTheme.modernShadow,
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove),
                            onPressed: () {
                              if (quantity > product.moqKg) {
                                setState(() => quantity -= (product.moqKg > 0 ? product.moqKg : 1)); 
                                if (quantity < product.moqKg) quantity = product.moqKg;
                              }
                            },
                          ),
                          Text('$quantity Kg', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: () {
                              final increment = product.moqKg > 0 ? product.moqKg : 1;
                              setState(() => quantity += increment); 
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        child: ElevatedButton.icon(
                          icon: Icon(
                            _justAdded ? Icons.check_circle : Icons.shopping_cart_outlined,
                            color: Colors.white,
                            size: 20,
                          ),
                          label: Text(
                            _justAdded
                                ? '✓ Added to Inquiry'
                                : 'Add to Inquiry',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _justAdded
                                ? const Color(0xFF2E7D32)
                                : AppTheme.primaryAction,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () => _handleAddToCart(product),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textLight)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
