import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import '../theme/app_theme.dart';
import '../widgets/shimmer_loader.dart';
import '../widgets/bouncy_card.dart';
import '../providers/product_provider.dart';
import '../providers/banner_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/location_provider.dart';
import '../providers/campaign_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkPermissions();
    });
  }

  Future<void> _checkPermissions() async {
    final prefs = await SharedPreferences.getInstance();

    // First-time location popup (only shows once, then never again)
    final hasAskedLoc = prefs.getBool('has_asked_location') ?? false;
    if (!hasAskedLoc && mounted) {
      await Future.delayed(const Duration(milliseconds: 1500));
      if (!mounted) return;
      
      final reqLoc = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => _buildLocationPrompt(),
      );
      await prefs.setBool('has_asked_location', true);

      if (reqLoc == true) {
        await requestAndSaveLocation();
      }
    }

    // Then check notifications
    final hasAskedNotif = prefs.getBool('has_asked_notifications') ?? false;
    if (!hasAskedNotif && mounted) {
      await Future.delayed(const Duration(milliseconds: 1000));
      if (!mounted) return;
      
      final reqNotif = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => _buildNotificationPrompt(),
      );
      await prefs.setBool('has_asked_notifications', true);

      if (reqNotif == true) {
        await requestAndSaveFCMToken();
      }
    }
  }

  Widget _buildLocationPrompt() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 48),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.primaryAction.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.location_on, size: 64, color: AppTheme.primaryAction),
          ),
          const SizedBox(height: 24),
          const Text(
            'Find Nearby Stock Instantly',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textDark),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'Enable location services to see accurate stock availability and ensure faster wholesale deliveries.',
            style: TextStyle(fontSize: 15, color: AppTheme.textLight, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryAction,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              onPressed: () {
                Navigator.pop(context, true);
              },
              child: const Text('ALLOW LOCATION', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1)),
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not Now', style: TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationPrompt() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 48),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.primaryAction.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.notifications_active, size: 64, color: AppTheme.primaryAction),
          ),
          const SizedBox(height: 24),
          const Text(
            'Stay Updated on Your Orders',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textDark),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'Enable notifications to receive real-time updates on your delivery and fresh arrivals.',
            style: TextStyle(fontSize: 15, color: AppTheme.textLight, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryAction,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              onPressed: () {
                Navigator.pop(context, true);
              },
              child: const Text('ALLOW NOTIFICATIONS', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1)),
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not Now', style: TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(productsProvider);
    final bannersAsync = ref.watch(bannersProvider);
    final campaignsAsync = ref.watch(campaignsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final unreadCount = ref.watch(unreadNotificationsCountProvider);
    final cartItems = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);

    final locationAsync = ref.watch(userLocationProvider);

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
        appBar: AppBar(
          backgroundColor: AppTheme.surface,
          elevation: 0,
          scrolledUnderElevation: 1,
          surfaceTintColor: Colors.transparent,
          toolbarHeight: 70,
          title: InkWell(
            onTap: () async {
              final result = await requestAndSaveLocation();
              if (result && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('Location updated successfully!'),
                  backgroundColor: AppTheme.primaryAction,
                ));
              } else if (!result && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('Could not access location.'),
                ));
              }
            },
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryAction.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.my_location, color: AppTheme.primaryAction, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Deliver to',
                            style: TextStyle(
                              color: AppTheme.textDark,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                      locationAsync.when(
                        data: (loc) => Text(
                          loc != null && loc.address.isNotEmpty ? loc.address : 'Use my current location',
                          style: const TextStyle(
                            color: AppTheme.textLight,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        loading: () => const Text('Locating...', style: TextStyle(color: AppTheme.textLight, fontSize: 11)),
                        error: (_, __) => const Text('Use my current location', style: TextStyle(color: AppTheme.textLight, fontSize: 11)),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.keyboard_arrow_right, color: AppTheme.textDark, size: 20),
              ],
            ),
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
                      shape: BoxShape.circle,
                    ),
                    child: CircleAvatar(
                      backgroundColor: Colors.transparent,
                      radius: 22,
                      child: IconButton(
                        icon: const Icon(Icons.notifications_none, color: AppTheme.textDark, size: 26),
                        onPressed: () => context.push('/notifications'),
                      ),
                    ),
                  ),
                  if (unreadCount > 0)
                    Positioned(
                      right: 0,
                      top: 4,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Text(
                          unreadCount > 9 ? '9+' : unreadCount.toString(),
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(productsProvider);
            ref.invalidate(bannersProvider);
            ref.invalidate(categoriesProvider);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              const SliverToBoxAdapter(child: SizedBox(height: 16)),

              // 1. Functional Search Bar (Moved above banner)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Container(
                    decoration: BoxDecoration(
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onSubmitted: (value) {
                        if (value.trim().isNotEmpty) {
                          context.push('/all-products?query=${Uri.encodeComponent(value.trim())}');
                        }
                      },
                      decoration: InputDecoration(
                        hintText: 'Search for commodities...',
                        hintStyle: const TextStyle(color: AppTheme.textLight),
                        prefixIcon: const Icon(Icons.search, color: AppTheme.textLight),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(vertical: 16),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppTheme.primaryAction, width: 2),
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // 2. Banner Carousel (Full width viewportFraction)
              SliverToBoxAdapter(
                child: bannersAsync.when(
                  data: (banners) {
                    if (banners.isEmpty) return const SizedBox.shrink();
                    return CarouselSlider(
                      options: CarouselOptions(
                        height: 200.0,
                        autoPlay: true,
                        enlargeCenterPage: true,
                        viewportFraction: 1.0, // Fixed: Full width banner
                        autoPlayInterval: const Duration(seconds: 4),
                        autoPlayAnimationDuration: const Duration(milliseconds: 800),
                        enlargeStrategy: CenterPageEnlargeStrategy.zoom,
                        padEnds: true,
                      ),
                      items: banners.map((banner) {
                        return BouncyCard(
                          onTap: () {
                            if (banner.redirectLink.isNotEmpty) {
                              context.push(banner.redirectLink);
                            }
                          },
                          child: Container(
                            width: MediaQuery.of(context).size.width,
                            margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.08),
                                  blurRadius: 15,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                CachedNetworkImage(
                                  imageUrl: banner.imageUrl,
                                  fit: BoxFit.cover,
                                  placeholder: (ctx, url) => Container(color: Colors.grey.shade100, child: const Center(child: CircularProgressIndicator(strokeWidth: 2))),
                                  errorWidget: (ctx, url, err) => Container(color: Colors.grey.shade100, child: const Icon(Icons.broken_image, color: Colors.grey)),
                                ),
                                // Optional subtle gradient overlay to make images pop
                                Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                      colors: [
                                        Colors.transparent,
                                        Colors.black.withValues(alpha: 0.2),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    );
                  },
                  loading: () => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8),
                    child: ShimmerLoader(width: double.infinity, height: 184, borderRadius: 20),
                  ),
                  error: (err, stack) => const SizedBox.shrink(),
                ),
              ),

              // 2.5 Live Alerts / Campaigns Ticker
              SliverToBoxAdapter(
                child: campaignsAsync.when(
                  data: (campaigns) {
                    if (campaigns.isEmpty) return const SizedBox.shrink();
                    return Container(
                      height: 50,
                      margin: const EdgeInsets.only(top: 8, bottom: 8),
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: campaigns.length,
                        itemBuilder: (context, index) {
                          final c = campaigns[index];
                          IconData icon = Icons.campaign;
                          Color color = AppTheme.primaryAction;
                          if (c.type == 'alert') { icon = Icons.warning_rounded; color = Colors.red; }
                          if (c.type == 'new_arrival') { icon = Icons.new_releases; color = Colors.green; }
                          if (c.type == 'price_drop') { icon = Icons.trending_down; color = Colors.blue; }
                          if (c.type == 'moving_fast') { icon = Icons.local_fire_department; color = Colors.orange; }
                          
                          return GestureDetector(
                            onTap: () {
                              showModalBottomSheet(
                                context: context,
                                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
                                builder: (ctx) => Container(
                                  padding: const EdgeInsets.all(24),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(icon, size: 48, color: color),
                                      const SizedBox(height: 16),
                                      Text(c.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textDark), textAlign: TextAlign.center),
                                      const SizedBox(height: 12),
                                      Text(c.body, style: const TextStyle(fontSize: 16, color: AppTheme.textLight), textAlign: TextAlign.center),
                                      if (c.imageUrl.isNotEmpty) ...[
                                        const SizedBox(height: 16),
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(12),
                                          child: CachedNetworkImage(imageUrl: c.imageUrl, height: 150, width: double.infinity, fit: BoxFit.cover),
                                        ),
                                      ],
                                      const SizedBox(height: 32),
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton(
                                          onPressed: () => Navigator.pop(ctx),
                                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryAction, padding: const EdgeInsets.symmetric(vertical: 16)),
                                          child: const Text('GOT IT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                        )
                                      )
                                    ],
                                  ),
                                ),
                              );
                            },
                            child: Container(
                              margin: const EdgeInsets.only(right: 12),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(25),
                                border: Border.all(color: color.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(icon, size: 18, color: color),
                                  const SizedBox(width: 8),
                                  Text(c.title, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 13)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (err, stack) => const SizedBox.shrink(),
                ),
              ),

              // 3. Dynamic Categories
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                  child: Text('Shop by Category', style: Theme.of(context).textTheme.titleLarge),
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 110,
                  child: categoriesAsync.when(
                    data: (categories) {
                      if (categories.isEmpty) {
                        return const Center(child: Text('No categories yet', style: TextStyle(color: AppTheme.textLight)));
                      }
                      return ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: categories.length,
                        itemBuilder: (context, index) {
                          final cat = categories[index];
                          final catName = cat['name'] ?? 'Unknown';
                          final catIcon = cat['iconUrl'] ?? '';
                          return BouncyCard(
                            onTap: () {
                              context.push('/category/$catName');
                            },
                            child: Container(
                              width: 80,
                              margin: const EdgeInsets.only(right: 12),
                              child: Column(
                                children: [
                                  Container(
                                    width: 70,
                                    height: 70,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                      boxShadow: AppTheme.modernShadow,
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: catIcon.isNotEmpty
                                      ? CachedNetworkImage(
                                          imageUrl: catIcon,
                                          fit: BoxFit.cover,
                                          placeholder: (ctx, url) => const Icon(Icons.category, color: AppTheme.primaryAction, size: 30),
                                          errorWidget: (ctx, url, err) => const Icon(Icons.category, color: AppTheme.primaryAction, size: 30),
                                        )
                                      : const Icon(Icons.category, color: AppTheme.primaryAction, size: 30),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    catName, 
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textDark),
                                    textAlign: TextAlign.center,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
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
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: 4,
                      itemBuilder: (ctx, i) => Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: Column(
                          children: [
                            ShimmerLoader(width: 70, height: 70, borderRadius: 35),
                            const SizedBox(height: 8),
                            ShimmerLoader(width: 50, height: 12, borderRadius: 4),
                          ],
                        ),
                      ),
                    ),
                    error: (e, s) => const Center(child: Text('Error loading categories')),
                  ),
                ),
              ),

              // 4. Featured Products Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Market Stock', style: Theme.of(context).textTheme.titleLarge),
                      TextButton(
                        onPressed: () => context.push('/all-products'),
                        child: const Text('See All', style: TextStyle(color: AppTheme.primaryAction, fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                ),
              ),
              
              // 5. Products Horizontal List
              SliverToBoxAdapter(
                child: productsAsync.when(
                  data: (allProducts) {
                    if (allProducts.isEmpty) {
                      return const Center(child: Padding(padding: EdgeInsets.all(40), child: Text('No commodities available.', style: TextStyle(color: AppTheme.textLight))));
                    }
                    // Take first 6 as featured
                    final products = allProducts.take(6).toList();

                    return SizedBox(
                      height: 300, // Slightly taller for the stepper
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: products.length,
                        itemBuilder: (context, index) {
                          final product = products[index];
                          
                          // Check cart state
                          final cartItemIndex = cartItems.indexWhere((i) => i.productId == product.id);
                          final inCart = cartItemIndex >= 0;
                          final cartQty = inCart ? cartItems[cartItemIndex].quantity : 0;
                          final moq = product.moqKg > 0 ? product.moqKg : 1;

                          return BouncyCard(
                            onTap: () => context.push('/product/${product.id}'),
                            child: Container(
                              width: 180,
                              margin: const EdgeInsets.only(right: 16, bottom: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(24),
                                boxShadow: AppTheme.modernShadow,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // White Image Container
                                  Expanded(
                                    flex: 4,
                                    child: Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.all(16),
                                      decoration: const BoxDecoration(
                                        color: Colors.white, // Clean white to blend with product images
                                        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                                      ),
                                      child: Stack(
                                        children: [
                                          Center(
                                            child: product.imageUrl.isNotEmpty
                                                ? CachedNetworkImage(
                                                    imageUrl: product.imageUrl,
                                                    fit: BoxFit.contain,
                                                    placeholder: (ctx, url) => const CircularProgressIndicator(strokeWidth: 2),
                                                    errorWidget: (ctx, url, err) => const Icon(Icons.inventory_2, color: AppTheme.textLight, size: 40),
                                                  )
                                                : const Icon(Icons.inventory_2, color: AppTheme.textLight, size: 40),
                                          ),
                                          
                                          // Stock badge (Top left)
                                          Positioned(
                                            top: 0, left: 0,
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: product.availableStockKg > 0 
                                                    ? AppTheme.secondaryAccent.withValues(alpha: 0.15) 
                                                    : Colors.red.withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                product.availableStockKg > 0 ? 'IN STOCK' : 'OUT',
                                                style: TextStyle(
                                                  color: product.availableStockKg > 0 ? AppTheme.secondaryAccent : Colors.red, 
                                                  fontSize: 9, 
                                                  fontWeight: FontWeight.w800, 
                                                  letterSpacing: 0.5
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  
                                  // Divider
                                  Container(height: 1, color: const Color(0xFFF3F4F6)),

                                  // Product Info & Action
                                  Expanded(
                                    flex: 5,
                                    child: Padding(
                                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            product.name, 
                                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.textDark),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const Text(
                                            'Request Quote',
                                            style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textLight, fontSize: 12),
                                          ),
                                          
                                          // B2B Cart Action
                                          SizedBox(
                                            width: double.infinity,
                                            height: 36,
                                            child: product.availableStockKg <= 0 
                                            ? ElevatedButton(
                                                onPressed: null,
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: Colors.grey.shade300,
                                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                                  padding: EdgeInsets.zero
                                                ),
                                                child: const Text('UNAVAILABLE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                                              )
                                            : inCart 
                                              // Cart Stepper UI
                                              ? Container(
                                                  decoration: BoxDecoration(
                                                    color: AppTheme.primaryAction.withValues(alpha: 0.1),
                                                    borderRadius: BorderRadius.circular(12),
                                                    border: Border.all(color: AppTheme.primaryAction.withValues(alpha: 0.3)),
                                                  ),
                                                  child: Row(
                                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                    children: [
                                                      IconButton(
                                                        padding: EdgeInsets.zero,
                                                        icon: const Icon(Icons.remove, size: 16, color: AppTheme.primaryAction),
                                                        onPressed: () {
                                                          cartNotifier.updateQuantity(product.id, cartQty - moq);
                                                        },
                                                      ),
                                                      Text(
                                                        '${cartQty}kg', 
                                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppTheme.primaryAction)
                                                      ),
                                                      IconButton(
                                                        padding: EdgeInsets.zero,
                                                        icon: const Icon(Icons.add, size: 16, color: AppTheme.primaryAction),
                                                        onPressed: () {
                                                          cartNotifier.updateQuantity(product.id, cartQty + moq);
                                                        },
                                                      ),
                                                    ],
                                                  ),
                                                )
                                              // Add Button UI
                                              : ElevatedButton(
                                                  onPressed: () {
                                                    cartNotifier.addItem(
                                                      CartItem(
                                                        productId: product.id,
                                                        name: product.name,
                                                        price: product.basePriceKg,
                                                        quantity: moq,
                                                        moqKg: moq,
                                                        incrementStepKg: product.incrementStepKg,
                                                        gstPercentage: product.gstPercentage,
                                                        imageUrl: product.imageUrl,
                                                      ),
                                                    );
                                                    ScaffoldMessenger.of(context).showSnackBar(
                                                      SnackBar(content: Text('Added $moq kg of ${product.name}!'), backgroundColor: AppTheme.primaryAction),
                                                    );
                                                  },
                                                  style: ElevatedButton.styleFrom(
                                                    backgroundColor: AppTheme.primaryAction,
                                                    elevation: 0,
                                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                                    padding: EdgeInsets.zero
                                                  ),
                                                  child: const Text(
                                                    'ADD TO INQUIRY', 
                                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.5)
                                                  ),
                                                ),
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
                    height: 300,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: 4,
                      itemBuilder: (context, index) {
                        return Container(
                          width: 180,
                          margin: const EdgeInsets.only(right: 16, bottom: 8),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                          child: Column(
                            children: [
                              Expanded(flex: 4, child: ShimmerLoader(width: double.infinity, height: double.infinity, borderRadius: 24)),
                              Expanded(
                                flex: 5,
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      ShimmerLoader(width: double.infinity, height: 16),
                                      ShimmerLoader(width: 80, height: 20),
                                      ShimmerLoader(width: double.infinity, height: 36, borderRadius: 12),
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
              const SliverToBoxAdapter(child: SizedBox(height: 48)),
            ],
          ),
        ),
      ),
    );
  }
}
