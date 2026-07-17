import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import '../providers/cart_provider.dart';

class ProductDetailsScreen extends ConsumerStatefulWidget {
  final String productId;
  const ProductDetailsScreen({super.key, required this.productId});

  @override
  ConsumerState<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends ConsumerState<ProductDetailsScreen> {
  int quantity = 10; // Default MOQ

  @override
  Widget build(BuildContext context) {
    // Mock Product Data
    final product = {
      'name': 'Premium Chana Dal',
      'price': 6200.0,
      'grade': 'A-Grade (Export Quality)',
      'moq': 10,
      'packaging': '50kg Jute Bag',
      'delivery': '3-5 Business Days',
      'description': 'High-quality, unpolished Chana Dal suitable for wholesale distribution and retail repacking.'
    };

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Product Details'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 250,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: AppTheme.softShadow,
              ),
              child: const Center(
                child: Icon(Icons.inventory_2, size: 100, color: AppTheme.textLight),
              ),
            ),
            const SizedBox(height: 24),
            Text(product['name'] as String, style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 28)),
            const SizedBox(height: 8),
            Text(product['grade'] as String, style: const TextStyle(color: AppTheme.primaryAction, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text('₹${product['price']} / Quintal', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 24)),
            const SizedBox(height: 24),
            Text('Specifications', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            _buildSpecRow('Minimum Order (MOQ)', '${product['moq']} Quintals'),
            _buildSpecRow('Packaging', product['packaging'] as String),
            _buildSpecRow('Delivery Time', product['delivery'] as String),
            const SizedBox(height: 24),
            Text('Description', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(product['description'] as String, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
      bottomNavigationBar: Container(
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
                  border: Border.all(color: Colors.grey.withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove),
                      onPressed: () {
                        if (quantity > (product['moq'] as int)) setState(() => quantity--);
                      },
                    ),
                    Text('$quantity', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.add),
                      onPressed: () => setState(() => quantity++),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryAction,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    ref.read(cartProvider.notifier).addItem(
                      CartItem(
                        productId: widget.productId,
                        name: product['name'] as String,
                        price: product['price'] as double,
                        quantity: quantity,
                      ),
                    );
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to Cart!')));
                  },
                  child: const Text('Add to Cart', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ],
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
