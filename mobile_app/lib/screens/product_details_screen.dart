import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
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

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(singleProductProvider(widget.productId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Product Details'),
      ),
      body: productAsync.when(
        data: (product) {
          // Initialize quantity to MOQ once
          if (!isInitialized) {
            quantity = product.moqKg;
            // if stock is lower than moq, we set to stock, or 0 if out of stock
            if (quantity > product.availableStockKg) {
              quantity = product.availableStockKg.toInt();
            }
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
                    boxShadow: AppTheme.softShadow,
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
                Text('₹${product.basePriceKg} / Kg', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 24)),
                const SizedBox(height: 24),
                Text('Specifications', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                _buildSpecRow('Minimum Order (MOQ)', '${product.moqKg} Kg'),
                _buildSpecRow('Available Stock', '${product.availableStockKg} Kg'),
                const SizedBox(height: 24),
                if (product.availableStockKg <= 0)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.warning, color: Colors.red),
                        SizedBox(width: 8),
                        Text('This product is currently out of stock.', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  )
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error loading product: $error')),
      ),
      bottomNavigationBar: productAsync.whenOrNull(
        data: (product) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const StickyCartBanner(),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: AppTheme.softShadow,
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
                            onPressed: product.availableStockKg <= 0 ? null : () {
                              if (quantity > product.moqKg) {
                                setState(() => quantity -= 50); // Decrement by 50kg at a time
                                if (quantity < product.moqKg) quantity = product.moqKg;
                              }
                            },
                          ),
                          Text('$quantity Kg', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: product.availableStockKg <= 0 ? null : () {
                              if (quantity + 50 <= product.availableStockKg) {
                                setState(() => quantity += 50); // Increment by 50kg at a time
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Cannot exceed available stock of ${product.availableStockKg} Kg')));
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: product.availableStockKg > 0 ? AppTheme.primaryAction : Colors.grey,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: product.availableStockKg <= 0 ? null : () {
                          ref.read(cartProvider.notifier).addItem(
                            CartItem(
                              productId: widget.productId,
                              name: product.name,
                              price: product.basePriceKg,
                              quantity: quantity,
                              gstPercentage: product.gstPercentage,
                            ),
                          );
                        },
                        child: Text(product.availableStockKg > 0 ? 'Add to Cart' : 'Out of Stock', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
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
