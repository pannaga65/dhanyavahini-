import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/product_model.dart';

// Streams from Firestore
final _productsStreamProvider = StreamProvider<QuerySnapshot>((ref) {
  return FirebaseFirestore.instance.collection('products').where('isActive', isEqualTo: true).snapshots();
});

final _inventoryStreamProvider = StreamProvider<QuerySnapshot>((ref) {
  return FirebaseFirestore.instance.collection('inventory').snapshots();
});

// Combined Provider that mimics the old FutureProvider for the UI
final productsProvider = Provider<AsyncValue<List<ProductModel>>>((ref) {
  final productsAsync = ref.watch(_productsStreamProvider);
  final inventoryAsync = ref.watch(_inventoryStreamProvider);

  if (productsAsync.isLoading || inventoryAsync.isLoading) {
    return const AsyncValue.loading();
  }
  if (productsAsync.hasError) {
    return AsyncValue.error(productsAsync.error!, productsAsync.stackTrace!);
  }
  if (inventoryAsync.hasError) {
    return AsyncValue.error(inventoryAsync.error!, inventoryAsync.stackTrace!);
  }

  final inventoryMap = <String, double>{};
  for (var doc in inventoryAsync.value!.docs) {
    final data = doc.data() as Map<String, dynamic>;
    final raw = data['availableStockKg'];
    inventoryMap[doc.id] = (raw is num) ? raw.toDouble() : 0.0;
  }

  final products = productsAsync.value!.docs.map((doc) {
    return ProductModel.fromFirestore(
      doc.data() as Map<String, dynamic>, 
      doc.id, 
      inventoryStock: inventoryMap[doc.id] ?? 0.0,
    );
  }).toList();

  return AsyncValue.data(products);
});

// Single Product Stream
final _singleProductStreamProvider = StreamProvider.family<DocumentSnapshot, String>((ref, productId) {
  return FirebaseFirestore.instance.collection('products').doc(productId).snapshots();
});

final _singleInventoryStreamProvider = StreamProvider.family<DocumentSnapshot, String>((ref, productId) {
  return FirebaseFirestore.instance.collection('inventory').doc(productId).snapshots();
});

final singleProductProvider = Provider.family<AsyncValue<ProductModel>, String>((ref, productId) {
  final productAsync = ref.watch(_singleProductStreamProvider(productId));
  final inventoryAsync = ref.watch(_singleInventoryStreamProvider(productId));

  if (productAsync.isLoading || inventoryAsync.isLoading) {
    return const AsyncValue.loading();
  }
  if (productAsync.hasError) {
    return AsyncValue.error(productAsync.error!, productAsync.stackTrace!);
  }
  if (inventoryAsync.hasError) {
    return AsyncValue.error(inventoryAsync.error!, inventoryAsync.stackTrace!);
  }

  final productSnap = productAsync.value!;
  if (!productSnap.exists) {
    return AsyncValue.error(Exception('Product not found'), StackTrace.current);
  }

  final inventoryData = inventoryAsync.value!.data() as Map<String, dynamic>?;
  final rawStock = inventoryData?['availableStockKg'] ?? 0;
  final inventoryStock = (rawStock is num) ? rawStock.toDouble() : 0.0;
      
  return AsyncValue.data(ProductModel.fromFirestore(
    productSnap.data() as Map<String, dynamic>, 
    productSnap.id, 
    inventoryStock: inventoryStock,
  ));
});

// Categories provider for dynamic "Shop by Category"
final categoriesProvider = StreamProvider<List<Map<String, dynamic>>>((ref) {
  return FirebaseFirestore.instance.collection('categories').orderBy('order').snapshots().map(
    (snap) => snap.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList()
  );
});
