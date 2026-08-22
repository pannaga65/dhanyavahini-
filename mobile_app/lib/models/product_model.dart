class ProductModel {
  final String id;
  final String name;
  final String category;
  final double basePriceKg;
  final int moqKg;
  final int incrementStepKg;
  final String imageUrl;
  final double availableStockKg;
  final bool isActive;
  final double gstPercentage;
  final String marketingBadge;

  ProductModel({
    required this.id,
    required this.name,
    required this.category,
    required this.basePriceKg,
    required this.moqKg,
    int? incrementStepKg,
    required this.imageUrl,
    required this.availableStockKg,
    required this.isActive,
    required this.gstPercentage,
    this.marketingBadge = '',
  }) : incrementStepKg = incrementStepKg ?? moqKg;

  factory ProductModel.fromFirestore(Map<String, dynamic> data, String id, {double inventoryStock = 0.0}) {
    final moq = (data['moqKg'] is num) ? (data['moqKg'] as num).toInt() : 100;
    return ProductModel(
      id: id,
      name: data['name'] ?? '',
      category: data['category'] ?? '',
      basePriceKg: (data['basePriceKg'] is num) ? (data['basePriceKg'] as num).toDouble() : 0.0,
      moqKg: moq,
      incrementStepKg: (data['incrementStepKg'] is num) ? (data['incrementStepKg'] as num).toInt() : moq,
      imageUrl: data['imageUrl'] ?? '',
      availableStockKg: inventoryStock,
      isActive: data['isActive'] ?? true,
      gstPercentage: (data['gstPercentage'] is num) ? (data['gstPercentage'] as num).toDouble() : 5.0,
      marketingBadge: data['marketingBadge'] ?? '',
    );
  }
}
