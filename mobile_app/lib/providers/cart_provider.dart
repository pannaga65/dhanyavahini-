import 'package:flutter_riverpod/flutter_riverpod.dart';

class CartItem {
  final String productId;
  final String name;
  final double price;
  final int quantity;
  
  CartItem({required this.productId, required this.name, required this.price, required this.quantity});
}

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  void addItem(CartItem item) {
    final existingIndex = state.indexWhere((i) => i.productId == item.productId);
    if (existingIndex >= 0) {
      final updatedList = [...state];
      updatedList[existingIndex] = CartItem(
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: state[existingIndex].quantity + item.quantity,
      );
      state = updatedList;
    } else {
      state = [...state, item];
    }
  }

  void removeItem(String productId) {
    state = state.where((item) => item.productId != productId).toList();
  }

  void clear() {
    state = [];
  }

  double get subtotal => state.fold(0, (sum, item) => sum + (item.price * item.quantity));
  double get gst => subtotal * 0.05; // 5% GST for grains
  double get total => subtotal + gst;
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});
