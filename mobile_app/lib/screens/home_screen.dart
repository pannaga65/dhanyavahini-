import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../widgets/shimmer_loader.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dhanyavahini'),
        actions: [
          IconButton(
            icon: const Icon(Icons.shopping_cart_outlined, size: 28),
            onPressed: () => context.push('/cart'),
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
          
          const SizedBox(height: 16),
          // Using Skeleton Loaders for a premium feel
          SizedBox(
            height: 400,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: 4, // Show 4 skeletons while loading
              itemBuilder: (context, index) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: AppTheme.softShadow,
                  ),
                  child: Row(
                    children: [
                      const ShimmerLoader(width: 80, height: 80, borderRadius: 16),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const ShimmerLoader(width: 150, height: 20),
                            const SizedBox(height: 8),
                            const ShimmerLoader(width: 100, height: 16),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const ShimmerLoader(width: 80, height: 24),
                                const ShimmerLoader(width: 60, height: 32, borderRadius: 20),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
