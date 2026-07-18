class ProductModel {
  final String id;
  final String name;
  final String category;
  final double basePriceKg;
  final int moqKg;
  final String imageUrl;
  final double availableStockKg;
  final bool isActive;

  ProductModel({
    required this.id,
    required this.name,
    required this.category,
    required this.basePriceKg,
    required this.moqKg,
    required this.imageUrl,
    required this.availableStockKg,
    required this.isActive,
  });

  factory ProductModel.fromFirestore(Map<String, dynamic> data, String id, {double inventoryStock = 0.0}) {
    return ProductModel(
      id: id,
      name: data['name'] ?? '',
      category: data['category'] ?? '',
      basePriceKg: (data['basePriceKg'] is num) ? (data['basePriceKg'] as num).toDouble() : 0.0,
      moqKg: (data['moqKg'] is num) ? (data['moqKg'] as num).toInt() : 100,
      imageUrl: data['imageUrl'] ?? '',
      availableStockKg: inventoryStock,
      isActive: data['isActive'] ?? true,
    );
  }
}
