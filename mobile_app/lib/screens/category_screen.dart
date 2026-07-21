import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';
import '../providers/product_provider.dart';
import '../providers/cart_provider.dart';

class CategoryScreen extends ConsumerWidget {
  final String categoryName;
  const CategoryScreen({super.key, required this.categoryName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(productsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(categoryName),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: productsAsync.when(
        data: (allProducts) {
          final products = allProducts
              .where((p) => p.category.toLowerCase() == categoryName.toLowerCase())
              .toList();

          if (products.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(40),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.inventory_2_outlined, size: 64, color: AppTheme.textLight),
                    const SizedBox(height: 16),
                    Text('No products available in $categoryName.', style: const TextStyle(color: AppTheme.textLight)),
                  ],
                ),
              ),
            );
          }

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.72,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
            ),
            itemCount: products.length,
            itemBuilder: (context, index) {
              final product = products[index];
              return GestureDetector(
                onTap: () => context.push('/product/${product.id}'),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 3,
                        child: Container(
                          width: double.infinity,
                          decoration: const BoxDecoration(
                            color: Color(0xFFF5F5F5),
                            borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Stack(
                            children: [
                              product.imageUrl.isNotEmpty
                                  ? CachedNetworkImage(
                                      imageUrl: product.imageUrl,
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                      height: double.infinity,
                                      placeholder: (ctx, url) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                                      errorWidget: (ctx, url, err) => const Center(child: Icon(Icons.inventory_2, color: AppTheme.textLight, size: 40)),
                                    )
                                  : const Center(child: Icon(Icons.inventory_2, color: AppTheme.textLight, size: 40)),
                              Positioned(
                                top: 8, right: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: product.availableStockKg > 0 
                                        ? AppTheme.primaryAction.withValues(alpha: 0.9) 
                                        : Colors.red.withValues(alpha: 0.9),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    product.availableStockKg > 0 ? 'In Stock' : 'Out',
                                    style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                product.name, 
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '₹${product.basePriceKg.toStringAsFixed(0)}/kg', 
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryAction, fontSize: 14),
                                  ),
                                  GestureDetector(
                                    onTap: () {
                                      if (product.availableStockKg > 0) {
                                        ref.read(cartProvider.notifier).addItem(
                                          CartItem(
                                            productId: product.id,
                                            name: product.name,
                                            price: product.basePriceKg,
                                            quantity: product.moqKg > 0 ? product.moqKg : 1, // Quick add moq
                                            gstPercentage: product.gstPercentage,
                                          ),
                                        );
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: product.availableStockKg > 0 ? AppTheme.primaryAction : Colors.grey,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Icon(Icons.add, color: Colors.white, size: 16),
                                    ),
                                  )
                                ],
                              )
                            ],
                          ),
                        ),
                      )
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
