#!/bin/bash
echo "Preparing Catmoji for Google noto-emoji format."
wget https://github.com/twitter/twemoji/archive/v13.1.0.tar.gz
tar -xf v13.1.0.tar.gz twemoji-13.1.0/assets/72x72/
mv twemoji-13.1.0/assets/72x72 ./twemojipng
rm -rf ./twemoji-13.1.0

for svg in ../overrides/*.svg; do
#   uncomment if you have inkscape < 1.0
#   inkscape -z -w 72 -h 72 $svg -e ${svg%.svg}.png
    inkscape -w 72 -h 72 $svg --export-filename ${svg%.svg}.png
done

mv ../overrides/*.png ./twemojipng/

pushd twemojipng/
for png in $(ls ??-*.png -1); do
    mv $png 00${png}
done
for png in *.png; do
    mv $png emoji_u${png//-/_}
done
for png in *.png; do
    mv "$png" "${png/_fe0f/}"
done
for png in *.png; do
    mv "$png" "${png/_fe0f/}"
done
popd
echo "Done! Now clone https://github.com/catmoji/noto-emoji read it's README.md and after installing everything run buildcatmoji.sh with /path/to/twemojipng/ as first argument."
