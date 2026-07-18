import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import '../theme/app_theme.dart';
import '../widgets/shimmer_loader.dart';
import '../providers/product_provider.dart';
import '../providers/banner_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(productsProvider);
    final bannersAsync = ref.watch(bannersProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Dhanyavahini'),
        elevation: 0,
        backgroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: AppTheme.textLight),
            onPressed: () {},
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(productsProvider);
          ref.invalidate(bannersProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Banner Carousel
              bannersAsync.when(
                data: (banners) {
                  if (banners.isEmpty) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 16.0),
                    child: CarouselSlider(
                      options: CarouselOptions(
                        height: 180.0,
                        autoPlay: true,
                        enlargeCenterPage: true,
                        viewportFraction: 0.9,
                        autoPlayInterval: const Duration(seconds: 4),
                      ),
                      items: banners.map((banner) {
                        return Builder(
                          builder: (BuildContext context) {
                            return GestureDetector(
                              onTap: () {
                                if (banner.redirectLink.isNotEmpty) {
                                  context.push(banner.redirectLink);
                                }
                              },
                              child: Container(
                                width: MediaQuery.of(context).size.width,
                                margin: const EdgeInsets.symmetric(horizontal: 5.0),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  color: Colors.white,
                                  image: DecorationImage(
                                    image: CachedNetworkImageProvider(banner.imageUrl),
                                    fit: BoxFit.cover,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.1),
                                      blurRadius: 8,
                                      offset: const Offset(0, 4),
                                    )
                                  ]
                                ),
                              ),
                            );
                          },
                        );
                      }).toList(),
                    ),
                  );
                },
                loading: () => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 20),
                  child: ShimmerLoader(width: double.infinity, height: 180, borderRadius: 16),
                ),
                error: (err, stack) => const SizedBox.shrink(),
              ),

              const SizedBox(height: 24),
              
              // 2. Shop by Category (Static for now, can be dynamic later)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text('Shop by Category', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 100,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _buildCategoryItem('Grains', Icons.grass),
                    _buildCategoryItem('Pulses', Icons.eco),
                    _buildCategoryItem('Spices', Icons.whatshot),
                    _buildCategoryItem('Oils', Icons.water_drop),
                    _buildCategoryItem('Flour', Icons.bakery_dining),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 3. Featured Products
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Featured Products', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    TextButton(
                      onPressed: () {}, // Future expansion
                      child: const Text('View All', style: TextStyle(color: AppTheme.primaryAction, fontWeight: FontWeight.bold)),
                    )
                  ],
                ),
              ),
              
              productsAsync.when(
                data: (products) {
                  if (products.isEmpty) {
                    return const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('No products available.')));
                  }
                  return GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: products.length,
                    itemBuilder: (context, index) {
                      final product = products[index];
                      return GestureDetector(
                        onTap: () => context.push('/product/${product.id}'),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              )
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Image
                              Expanded(
                                flex: 3,
                                child: Container(
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    color: AppTheme.background,
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: product.imageUrl.isNotEmpty
                                      ? CachedNetworkImage(
                                          imageUrl: product.imageUrl,
                                          fit: BoxFit.cover,
                                        )
                                      : const Icon(Icons.inventory_2, color: AppTheme.textLight, size: 50),
                                ),
                              ),
                              // Details
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
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('₹${product.basePriceKg}/kg', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryAction)),
                                          Container(
                                            padding: const EdgeInsets.all(4),
                                            decoration: BoxDecoration(
                                              color: product.availableStockKg > 0 ? AppTheme.primaryAction : Colors.grey,
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(Icons.add, color: Colors.white, size: 16),
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
                loading: () => GridView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.75,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: 4,
                  itemBuilder: (context, index) {
                    return Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          const Expanded(flex: 3, child: ShimmerLoader(width: double.infinity, height: double.infinity, borderRadius: 16)),
                          Expanded(
                            flex: 2,
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  ShimmerLoader(width: double.infinity, height: 16),
                                  SizedBox(height: 8),
                                  ShimmerLoader(width: 60, height: 16),
                                ],
                              ),
                            ),
                          )
                        ],
                      ),
                    );
                  },
                ),
                error: (e, s) => Center(child: Text('Error: $e')),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryItem(String title, IconData icon) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppTheme.primaryAction.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppTheme.primaryAction, size: 32),
          ),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
