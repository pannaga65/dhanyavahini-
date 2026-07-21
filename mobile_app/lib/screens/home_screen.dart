import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import '../theme/app_theme.dart';
import '../widgets/shimmer_loader.dart';
import '../providers/product_provider.dart';
import '../providers/banner_provider.dart';
import '../providers/cart_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(productsProvider);
    final bannersAsync = ref.watch(bannersProvider);
    final categoriesAsync = ref.watch(categoriesProvider);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldExit = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Exit App?'),
            content: const Text('Are you sure you want to exit the app?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('CANCEL', style: TextStyle(color: AppTheme.primaryAction))),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryAction),
                onPressed: () => Navigator.pop(context, true),
                child: const Text('EXIT', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
        if (shouldExit == true) {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(productsProvider);
            ref.invalidate(bannersProvider);
            ref.invalidate(categoriesProvider);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // App Bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Dhanyavahini', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, fontSize: 24)),
                          const SizedBox(height: 2),
                          const Text('Fresh grains at your doorstep', style: TextStyle(color: AppTheme.textLight, fontSize: 13)),
                        ],
                      ),
                      CircleAvatar(
                        backgroundColor: AppTheme.primaryAction.withValues(alpha: 0.1),
                        child: IconButton(
                          icon: const Icon(Icons.search, color: AppTheme.primaryAction),
                          onPressed: () {},
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 1. Banner Carousel
              SliverToBoxAdapter(
                child: bannersAsync.when(
                  data: (banners) {
                    if (banners.isEmpty) return const SizedBox(height: 16);
                    return Padding(
                      padding: const EdgeInsets.only(top: 20.0),
                      child: CarouselSlider(
                        options: CarouselOptions(
                          height: 170.0,
                          autoPlay: true,
                          enlargeCenterPage: true,
                          viewportFraction: 0.9,
                          autoPlayInterval: const Duration(seconds: 4),
                          autoPlayAnimationDuration: const Duration(milliseconds: 800),
                        ),
                        items: banners.map((banner) {
                          return GestureDetector(
                            onTap: () {
                              if (banner.redirectLink.isNotEmpty) {
                                context.push(banner.redirectLink);
                              }
                            },
                            child: Container(
                              width: MediaQuery.of(context).size.width,
                              margin: const EdgeInsets.symmetric(horizontal: 4.0),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(20),
                                color: Colors.grey.shade200,
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 4)),
                                ],
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: CachedNetworkImage(
                                imageUrl: banner.imageUrl,
                                fit: BoxFit.cover,
                                placeholder: (ctx, url) => Container(color: Colors.grey.shade200),
                                errorWidget: (ctx, url, err) => Container(color: Colors.grey.shade200, child: const Icon(Icons.broken_image)),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    );
                  },
                  loading: () => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20.0, horizontal: 20),
                    child: ShimmerLoader(width: double.infinity, height: 170, borderRadius: 20),
                  ),
                  error: (err, stack) => const SizedBox(height: 16),
                ),
              ),

              // 2. Dynamic Categories
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Text('Shop by Category', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 100,
                  child: categoriesAsync.when(
                    data: (categories) {
                      if (categories.isEmpty) {
                        return const Center(child: Text('No categories yet', style: TextStyle(color: AppTheme.textLight)));
                      }
                      return ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: categories.length,
                        itemBuilder: (context, index) {
                          final cat = categories[index];
                          final catName = cat['name'] ?? 'Unknown';
                          final catIcon = cat['iconUrl'] ?? '';
                          return GestureDetector(
                            onTap: () {
                              context.push('/category/$catName');
                            },
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 8),
                              child: Column(
                                children: [
                                  Container(
                                    width: 60,
                                    height: 60,
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryAction.withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: catIcon.isNotEmpty
                                        ? ClipOval(
                                            child: CachedNetworkImage(
                                              imageUrl: catIcon,
                                              fit: BoxFit.cover,
                                              width: 60, height: 60,
                                              placeholder: (ctx, url) => const Icon(Icons.category, color: AppTheme.primaryAction),
                                              errorWidget: (ctx, url, err) => const Icon(Icons.category, color: AppTheme.primaryAction),
                                            ),
                                          )
                                        : const Icon(Icons.category, color: AppTheme.primaryAction, size: 28),
                                  ),
                                  const SizedBox(height: 8),
                                  SizedBox(
                                    width: 70,
                                    child: Text(
                                      catName, 
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600), 
                                      textAlign: TextAlign.center,
                                      maxLines: 1, 
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      );
                    },
                    loading: () => ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: 5,
                      itemBuilder: (ctx, i) => Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Column(children: [
                          ShimmerLoader(width: 60, height: 60, borderRadius: 30),
                          const SizedBox(height: 8),
                          ShimmerLoader(width: 50, height: 12),
                        ]),
                      ),
                    ),
                    error: (e, s) => const Center(child: Text('Error loading categories')),
                  ),
                ),
              ),

              // 3. Featured Products Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Featured Products', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      TextButton(
                        onPressed: () => context.push('/all-products'),
                        child: const Text('See All', style: TextStyle(color: AppTheme.primaryAction, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
              ),
              
              // 4. Products Horizontal List
              SliverToBoxAdapter(
                child: productsAsync.when(
                  data: (allProducts) {
                    if (allProducts.isEmpty) {
                      return const Center(child: Padding(padding: EdgeInsets.all(40), child: Text('No products available.', style: TextStyle(color: AppTheme.textLight))));
                    }
                    // Take first 6 as featured
                    final products = allProducts.take(6).toList();

                    return SizedBox(
                      height: 260, // Fixed height for horizontal list
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: products.length,
                        itemBuilder: (context, index) {
                          final product = products[index];
                          return GestureDetector(
                            onTap: () => context.push('/product/${product.id}'),
                            child: Container(
                              width: 160,
                              margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 4)),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Product Image
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
                                          // Stock badge
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
                                  // Product Info
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
                      ),
                    );
                  },
                  loading: () => SizedBox(
                    height: 260,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: 4,
                      itemBuilder: (context, index) {
                        return Container(
                          width: 160,
                          margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
                          child: Column(
                            children: [
                              Expanded(flex: 3, child: ShimmerLoader(width: double.infinity, height: double.infinity, borderRadius: 18)),
                              Expanded(
                                flex: 2,
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      ShimmerLoader(width: double.infinity, height: 14),
                                      ShimmerLoader(width: 70, height: 14),
                                    ],
                                  ),
                                ),
                              )
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                  error: (e, s) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        children: [
                          const Icon(Icons.cloud_off, size: 48, color: AppTheme.textLight),
                          const SizedBox(height: 12),
                          const Text('Error loading products', style: TextStyle(color: AppTheme.textLight)),
                          const SizedBox(height: 4),
                          Text('$e', style: const TextStyle(fontSize: 12, color: Colors.red), textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => ref.invalidate(productsProvider),
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Bottom spacing
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
        ),
      ),
    );
  }
}
