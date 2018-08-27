if (process.platform == 'linux') {
    require('child_process').execSync(`${__dirname}/toolchain/linux_build.sh`, {stdio: [0, 1, 2]})
}