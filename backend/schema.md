fdCustCode	char	7
fdCustName	varchar	50
fdContact	char	25
fdAddr1	varchar	255
fdAddr2	varchar	80
fdCityName	char	35
fdTelp	char	50
fdFax	char	50
fdHP	char	50
fdEmpCode	char	4
fdEmpName	char	25
fdBillTo	varchar	50
fdBillAddr1	varchar	255
fdBillAddr2	varchar	80
fdBillCityName	char	35
fdBroker -> 0 = tidak broker, 1 = broker
fdBlocked	int	 -> status dari tabel status,
0	NO STATUS
1	OK
2	COD
3	WARNING
4	BLOCKED
5	URGENT

tabel alamat:
fdCustCode	varchar	7		True	1
fdID	char	2		True	2
fdContact	varchar	100		True	
fdHP	varchar	25		True	
fdTelp	varchar	25		True	
fdEmail	varchar	50		True	
fdAddr	varchar	255		True	
fdCity	varchar	100		True	
fdAktif	int			True	3
