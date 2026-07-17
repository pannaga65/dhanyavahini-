import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dhanyavahini'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, size: 28),
            onPressed: () {},
          )
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Simulated "Streak" or "Status" card from the Levoro screenshot
          Container(
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(24),
              boxShadow: AppTheme.softShadow,
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Text('🔥', style: TextStyle(fontSize: 28)),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Pending Orders', style: Theme.of(context).textTheme.titleLarge),
                            Text('2 orders await review', style: Theme.of(context).textTheme.bodyMedium),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.secondaryAccent.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Action',
                        style: TextStyle(color: AppTheme.secondaryAccent, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    )
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(6, (index) {
                    bool isActive = index == 2;
                    return Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isActive ? AppTheme.secondaryAccent : AppTheme.background,
                        shape: BoxShape.circle,
                        border: index == 5 ? Border.all(color: AppTheme.secondaryAccent, width: 2) : null,
                      ),
                      child: isActive ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
                    );
                  }),
                )
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          Text('Product Catalog', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          
          // Product Card replicating the "Continue Reading" style
          Container(
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(24),
              boxShadow: AppTheme.softShadow,
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.withOpacity(0.2)),
                  ),
                  child: const Center(child: Icon(Icons.inventory_2_outlined, color: AppTheme.textLight)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Premium Wheat', style: Theme.of(context).textTheme.bodyMedium),
                      const SizedBox(height: 4),
                      Text('₹1,500 / Quintal', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 18)),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(
                        value: 0.6,
                        backgroundColor: AppTheme.background,
                        color: AppTheme.primaryAction,
                        borderRadius: BorderRadius.circular(10),
                      )
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Container(
                  decoration: const BoxDecoration(
                    color: AppTheme.primaryAction,
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(8),
                  child: const Icon(Icons.shopping_cart, color: Colors.white, size: 24),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
