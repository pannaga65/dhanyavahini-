class ProductModel {
  final String id;
  final String name;
  final String category;
  final double basePriceKg;
  final int moqKg;
  final String imageUrl;
  final int availableStockKg;
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

  factory ProductModel.fromFirestore(Map<String, dynamic> data, String id, {int inventoryStock = 0}) {
    return ProductModel(
      id: id,
      name: data['name'] ?? '',
      category: data['category'] ?? '',
      basePriceKg: (data['basePriceKg'] ?? 0).toDouble(),
      moqKg: data['moqKg'] ?? 100, // Default 100kg if missing
      imageUrl: data['imageUrl'] ?? '',
      availableStockKg: inventoryStock,
      isActive: data['isActive'] ?? true,
    );
  }
}
