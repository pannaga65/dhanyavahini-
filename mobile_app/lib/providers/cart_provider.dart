import 'package:flutter_riverpod/flutter_riverpod.dart';

class CartItem {
  final String productId;
  final String name;
  final double price;
  final int quantity;
  final double gstPercentage;
  
  CartItem({required this.productId, required this.name, required this.price, required this.quantity, required this.gstPercentage});
}

class CartNotifier extends Notifier<List<CartItem>> {
  @override
  List<CartItem> build() {
    return [];
  }

  void addItem(CartItem item) {
    final existingIndex = state.indexWhere((i) => i.productId == item.productId);
    if (existingIndex >= 0) {
      final updatedList = [...state];
      updatedList[existingIndex] = CartItem(
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: state[existingIndex].quantity + item.quantity,
        gstPercentage: item.gstPercentage,
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
  double get totalGst => state.fold(0, (sum, item) => sum + (item.price * item.quantity * (item.gstPercentage / 100)));
  double get total => subtotal + totalGst;
}

final cartProvider = NotifierProvider<CartNotifier, List<CartItem>>(() {
  return CartNotifier();
});
