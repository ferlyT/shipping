1. cek m3 dari db
1.1. m3 packing list dari query "exec get_m3PL_listcode 'fdListCode'"
1.2. m3 gudang dari query "exec get_m3Gudang_listcode 'fdListCode'"
1.3. m3 customer per marking dari query "exec get_data_m3_cust_per_marking 'fdListCode'"
1.4 m3 komplain



cari data harga customer :get_profile_harga_customer 









cek harga tax return dengan query 'get_tax_return '@fdCustCode''


 periksa status customer :
 apabila cod atau urgent ambil m3 yang paling tinggi


 
2. cek harga dari db
3. cek biaya local dari db
4. cek total billing 
5. 



TIPE TAGIHAN (Badge Kanan Atas)
Data: res.profileHarga.typeTagihan
Nilai: 1 (m3 + Kg), 2 ( compare m3 : Kg),3 (m3 tidak kena Kg), 4 (Kg)

HARGA MASTER -> ganti jadi Harga M3
Data: res.profileHarga.harga (diformat mata uang / —)
RASIO HARGA - > Rasio
Data: res.profileHarga.rasio (diformat 2 desimal / —)
BATAS MIN. KG -> Harga Kg
Data: res.profileHarga.kg (diformat X kg / —)
TAX RETURN PRICE -> Tax Return Tarif
Data: res.profileHarga.taxReturnPrice (diformat mata uang / —)

tambah :

Tax Return Min Charge -> fdTaxReturnMinCharge