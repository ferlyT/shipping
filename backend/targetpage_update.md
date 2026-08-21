pada get_data_billing_and_data_m3  ada kolom baru:


fdVFCGudang ->volume freight charges gudang untuk barang udara
fdTotalQtyGudang 

fdM3PL,
fdVFCPL ->volume freight charges Packing list untuk barang udara
fdTotalQtyPL,

fdM3Komplain,
fdVFCKomplain,
fdTotalQtyKomplain,
ek.fdJmlBeratKomplain

lakukan validasi -> 

apabila laut 

apabila fdM3Komplain > 0 maka cek apakah fdTotalQtyKomplain = Jml_pack = fdTotalQtyGudang cek juga 
ek.fdJmlBeratKomplain apakah = Berat

apabila fdM3Komplain > 0 atau null -> cek apakah fdTotalQtyGudang = Jml_pack


tampilkan data ini pada page target,