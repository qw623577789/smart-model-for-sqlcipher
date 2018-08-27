# smart-model-for-sqlcipher
本库目前自动编译仅支持Linux
``` shell
sudo apt install sqlite3
sudo apt install libsqlcipher-dev
export LDFLAGS="-L/usr/local/lib"
export CPPFLAGS="-I/usr/local/include -I/usr/local/include/sqlcipher"
export CXXFLAGS="$CPPFLAGS"
cd node_modules/sqlite3
npm i --build-from-source --sqlite_libname=sqlcipher --sqlite=/usr/local
```