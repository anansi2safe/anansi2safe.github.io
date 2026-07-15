[TOC]

## 内核镜像
注意以下内容全部都需要使用代理，所以先设置好网络环境：
```bash
export http_proxy=<Your proxy>
export https_proxy=<Your proxy>
git config --global http.proxy <Your proxy>
git config --global https.proxy <Your proxy>
```
参考：[Android kernel build](https://source.android.com/docs/setup/build/building-kernels?hl=zh-cn)
### 1.源码获取
```bash
$ repo init -u https://android.googlesource.com/kernel/manifest -b common-android12-5.10
$ repo sync -d
```
源码获取成功后你应该在项目根目录下看到如下内容：
```bash
$ ls
build   common-modules  kernel  prebuilts         tools
common  hikey-modules   prebuilts-master
```
[内核分支](https://android.googlesource.com/kernel/manifest/+refs)
### 2.内核编译
android13开始引入了[Bazel](https://bazel.build?hl=zh-cn) 构建内核的功能，具体查看官方文档，这里我主要使用android12，所以使用旧的build.sh方法。
源码及编译工具获取完成后，使用如下命令开始编译：
```bash
BUILD_CONFIG=common/build.config.self.x86_64 ./build/build.sh
```
这里的common/build.config.self.x86_64编译脚本是我自己写的，当然官方也有提供，可以直接使用官方的，假设官方提供的脚本无法满足你的编译参数要求也可以像我一样自己编写，build.config.self.x86_64具体内容：
```bash
. ${ROOT_DIR}/${KERNEL_DIR}/build.config.common
. ${ROOT_DIR}/${KERNEL_DIR}/build.config.x86_64
DEFCONFIG=gki_defconfig
POST_DEFCONFIG_CMDS="check_defconfig && update_self_config"
KERNEL_DIR=common
function update_self_config() {
    ${KERNEL_DIR}/scripts/config --file ${OUT_DIR}/.config \
         -e CONFIG_KGDB \
         -e CONFIG_HAVE_ARCH_KGDB \
         -e CONFIG_KGDB_HONOUR_BLOCKLIST \
         -e CONFIG_KGDB_KDB \
         -e CONFIG_DEBUG_INFO \
         -e CONFIG_DEBUG_INFO_DWARF4 \
         -e CONFIG_VT \
         -e CONFIG_VT_CONSOLE \
         -e CONFIG_VT_CONSOLE_SLEEP \
         -e CONFIG_KASAN \
         -e CONFIG_KASAN_INLINE \
         -e CONFIG_KCOV \
         -e CONFIG_PANIC_ON_WARN_DEFAULT_ENABLE \
         -d CONFIG_RANDOMIZE_BASE \
         --set-val CONFIG_FRAME_WARN 0 \
         -d LTO_CLANG_THIN \
         -d LTO_CLANG_FULL \
         -d CFI_PERMISSIVE \
         -d CFI_CLANG \
         -d SHADOW_CALL_STACK
    (cd ${OUT_DIR} && \
     make ${CC_LD_ARG} O=${OUT_DIR})
}
```
编译完成后会有一个out目录，编译结果就保存在里面，以我的为例，编译结果保存在`out/android12-5.10/dist/`中，此时在此目录中你应该看到：
```bash
$ ls out/android12-5.10/dist/
abi.prop               kernel-uapi-headers.tar.gz  System.map         vmlinux
bzImage                modules.builtin             test_mappings.zip  vmlinux.symvers
kernel-headers.tar.gz  modules.builtin.modinfo     virtio_mem.ko
```
其中bzImage就是最重要的内核镜像，vmlinux可以便于我们调试。
现在还需要编译ko模块，与编译内核镜像方法差不多，我这里直接使用了官方提供的编译脚本：
```bash
BUILD_CONFIG=common-modules/virtual-device/build.config.virtual_device_kgdb.x86_64 ./build/build.sh
```
编译结果与内核镜像存放在同一目录下，模块编译完成后dist目录下应该会多出很多内容，主要用到的就是initramfs.img：
```bash
$ ls out/android12-5.10/dist/
abi.prop                    modules.load              vendor_boot.modules.load
ac97_bus.ko                 nd_virtio.ko              vhci-hcd.ko
btintel.ko                  net_failover.ko           virtio_balloon.ko
btrtl.ko                    psmouse.ko                virtio_blk.ko
btusb.ko                    pulse8-cec.ko             virtio_console.ko
bzImage                     rtc-test.ko               virtio_dma_buf.ko
cfg80211.ko                 slcan.ko                  virtio-gpu.ko
dummy-cpufreq.ko            snd-ac97-codec.ko         virtio_input.ko
failover.ko                 snd-hda-codec-generic.ko  virtio_mem.ko
gnss-cmdline.ko             snd-hda-codec.ko          virtio_mmio.ko
gnss-serial.ko              snd-hda-codec-realtek.ko  virtio_net.ko
gs_usb.ko                   snd-hda-core.ko           virtio_pci.ko
hci_vhci.ko                 snd-hda-intel.ko          virtio_pmem.ko
initramfs.img               snd-intel8x0.ko           virtio-rng.ko
kernel-headers.tar.gz       snd-intel-dspcfg.ko       virtio_snd.ko
kernel-uapi-headers.tar.gz  system_heap.ko            virt_wifi.ko
ledtrig-audio.ko            System.map                virt_wifi_sim.ko
lzo.ko                      test_mappings.zip         vmlinux
lzo-rle.ko                  test_meminit.ko           vmlinux.symvers
mac80211_hwsim.ko           test_stackinit.ko         vmw_vsock_virtio_transport.ko
mac80211.ko                 tpm.ko                    zram.ko
md-mod.ko                   tpm_vtpm_proxy.ko         zsmalloc.ko
modules.builtin             usbip-core.ko
modules.builtin.modinfo     vcan.ko
```
如果获取源码后发现小版本不是你想要的小版本，比如我想要的内核版本是5.10.136，如果直接按照我上面的方法获取到的内核源码实际上是5.10.237的，现在我想要136小版本的源码，那我就可以直接cd进common目录然后直接使用`git checkout -b`来切换内核小版本，就目前来讲这么做我还没遇到过问题，应该是可以的，如果真要说可能会遇到什么问题，那就是在模拟器中运行时可能会因为版本不匹配出现问题，但我目前还没遇到，等遇到再说吧。

编译过程没有太多问题，只要网络与存储空间没问题，基本上按照官方文档写的去做，不会有什么问题。
## Cuttlefish模拟器
参考资料：[Cuttlefish](https://source.android.com/docs/devices/cuttlefish/get-started?hl=zh-cn)
### 1.环境检查
一开始我本来想直接用android studio的emulator模拟器，然后将它下载的官方镜像替换为我编译的同版本内核镜像直接运行，但是有各种问题，不成功，所以最终还是使用Cuttlefish，Cuttlefish的安装配置会麻烦一些，坑也比较多。
先确保可以在基于内核的虚拟机 (KVM) 上实现虚拟化：
x86_64
```bash
#最后应该返回一个非0值，否则就是有问题
$ grep -c -w "vmx\|svm" /proc/cpuinfo
```
arm64
```bash
$ find /dev -name kvm
```
### 2.编译
安装环境依赖：
```bash
$ sudo apt install -y git devscripts equivs config-package-dev debhelper-compat golang curl
```
获取源码：
```bash
$ git clone https://github.com/google/android-cuttlefish
```
开始编译：
```bash
cd android-cuttlefish
tools/buildutils/build_packages.sh
```
### 3.问题
之后有可能会出现大量的网络问题，首先是`tools/buildutils/installbazel.sh`执行时出现错误（具体错误提示我忘记了，好像是“Failed to connect to bazel.build port 443 after 294885 ms: 连接超时“什么的），如果遇到直接修改`installbazel.sh`脚本：
```bash
# 关键添加内容
export http_proxy=http://127.0.0.1:12334
export https_proxy=http://127.0.0.1:12334
export JAVA_TOOL_OPTIONS='-Djava.net.useSystemProxies=true'
# 原有内容
set -e

function install_bazel_x86_64() {
  echo "Installing bazel"
  apt install apt-transport-https curl gnupg -y
  curl -fsSL https://bazel.build/bazel-release.pub.gpg | gpg --dearmor >bazel-archive-keyring.gpg
  mv bazel-archive-keyring.gpg /usr/share/keyrings
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/bazel-archive-keyring.gpg] https://storage.googleapis.com/bazel-apt stable jdk1.8" | tee /etc/apt/sources.list.d/bazel.list
  # bazel needs the zip command to gather test outputs but doesn't depend on it
  apt-get update && apt-get install -y bazel zip unzip
}

function install_bazel_aarch64() {
  BAZELISK_VERSION=v1.19.0
  apt install wget
  tmpdir="$(mktemp -t -d bazel_installer_XXXXXX)"
  trap "rm -rf $tmpdir" EXIT
  pushd "${tmpdir}"
  wget "https://github.com/bazelbuild/bazelisk/releases/download/${BAZELISK_VERSION}/bazelisk-linux-arm64"
  mv bazelisk-linux-arm64 /usr/local/bin/bazel
  chmod 0755 /usr/local/bin/bazel
  popd
}

install_bazel_$(uname -m)
```
主要就是增加了代理，之后有可能会在Analyzing阶段下载依赖是不断出现连接超时的问题，错误输出大概可能如下：
```bash

Analyzing: target //cuttlefish/package:cvd (2 packages loaded, 23220 targets configured)

Analyzing: target //cuttlefish/package:cvd (2 packages loaded, 23220 targets configured)

WARNING: Download from https://github.com/unicode-org/icu/releases/download/release-76-1/icu4c-76_1-src.tgz failed: class java.io.IOException Connect timed out
WARNING: Download from https://github.com/google/boringssl/releases/download/0.20241024.0/boringssl-0.20241024.0.tar.gz failed: class java.io.IOException Connect timed out
INFO: Repository icu++_repo_rules+icu_dat instantiated at:
  <builtin>: in <toplevel>
Repository rule http_archive defined at:
  /home/anansi/.cache/bazel/_bazel_anansi/f1ddbdbf66641495720e678963c7609b/external/bazel_tools/tools/build_defs/repo/http.bzl:392:31: in <toplevel>
INFO: Repository boringssl+ instantiated at:
  <builtin>: in <toplevel>
Repository rule http_archive defined at:
  /home/anansi/.cache/bazel/_bazel_anansi/f1ddbdbf66641495720e678963c7609b/external/bazel_tools/tools/build_defs/repo/http.bzl:392:31: in <toplevel>
ERROR: /home/anansi/.cache/bazel/_bazel_anansi/f1ddbdbf66641495720e678963c7609b/external/bazel_tools/tools/build_defs/repo/http.bzl:137:45: An error occurred during the fetch of repository 'icu++_repo_rules+icu_dat':
   Traceback (most recent call last):
	File "/home/anansi/.cache/bazel/_bazel_anansi/f1ddbdbf66641495720e678963c7609b/external/bazel_tools/tools/build_defs/repo/http.bzl", line 137, column 45, in _http_archive_impl
		download_info = ctx.download_and_extract(
Error in download_and_extract: java.io.IOException: Error downloading [https://github.com/unicode-org/icu/releases/download/release-76-1/icu4c-76_1-src.tgz] to /home/anansi/.cache/bazel/_bazel_anansi/f1ddbdbf66641495720e678963c7609b/external/icu++_repo_rules+icu_dat/temp5768304499620051615/icu4c-76_1-src.tgz: Connect timed out
Analyzing: target //cuttlefish/package:cvd (2 packages loaded, 23220 targets configured)

ERROR: no such package '@@icu++_repo_rules+icu_dat//': java.io.IOException: Error downloading [https://github.com/unicode-org/icu/releases/download/release-76-1/icu4c-76_1-src.tgz] to /home/anansi/.cache/bazel/_bazel_anansi/f1ddbdbf66641495720e678963c7609b/external/icu++_repo_rules+icu_dat/temp5768304499620051615/icu4c-76_1-src.tgz: Connect timed out
ERROR: /home/anansi/.cache/bazel/_bazel_anansi/f1ddbdbf66641495720e678963c7609b/external/icu+/icu4c/source/common/BUILD.bazel:44:11: @@icu+//icu4c/source/common:platform depends on @@icu++_repo_rules+icu_dat//:icu_dat in repository @@icu++_repo_rules+icu_dat which failed to fetch. no such package '@@icu++_repo_rules+icu_dat//': java.io.IOException: Error downloading [https://github.com/unicode-org/icu/releases/download/release-76-1/icu4c-76_1-src.tgz] to /home/anansi/.cache/bazel/_bazel_anansi/f1ddbdbf66641495720e678963c7609b/external/icu++_repo_rules+icu_dat/temp5768304499620051615/icu4c-76_1-src.tgz: Connect timed out
ERROR: Analysis of target '//cuttlefish/package:cvd' failed; build aborted: Analysis failed
INFO: Elapsed time: 56.765s, Critical Path: 0.12s
INFO: 1 process: 1 internal.
ERROR: Build did NOT complete successfully
FAILED: 
make[1]: *** [debian/rules:69：override_dh_auto_build] 错误 1
make[1]: 离开目录“/home/anansi/myspace/google/android/cvd/android-cuttlefish/base”
make: *** [debian/rules:59：binary] 错误 2
dpkg-buildpackage: 错误: debian/rules binary subprocess returned exit status 2
debuild: fatal error at line 1182:
dpkg-buildpackage -us -uc -ui -i -b failed
```
这个问题似乎不是百分百一定出现，我在两台电脑上搭建的环境，其中一台就没遇到过这个问题，最后通过设置Bazel代理解决，其中Dhttp.proxyHost是你的代理主机，Dhttps.proxyPort=2341是你的代理端口：
```
$ echo "startup --host_jvm_args=-Dhttp.proxyHost=127.0.0.1 --host_jvm_args=-Dhttp.proxyPort=2341" >> ~/.bazelrc
$ echo "startup --host_jvm_args=-Dhttps.proxyHost=127.0.0.1 --host_jvm_args=-Dhttps.proxyPort=2341" >> ~/.bazelrc
```
最后可能还会遇到Go库的问题，`frontend/src/goutil`默认使用了`"proxy.golang.org|proxy.golang.org|direct"`这在国内网络访问可能会出现问题，直接修改`frontend/src/goutil`：
```bash
#!/usr/bin/env bash

set -e
set -x

cd $1
shift


# Override these variables to make go not depend on HOME
mkdir -p /tmp/go
export GOPATH=/tmp/go
export GOCACHE=/tmp/go/go-build

GOBIN=go
if ! command -v go &> /dev/null
then
  GOBIN=/usr/lib/go-1.13/bin/go
fi

version=`$GOBIN version | { read _ _ v _; echo ${v#go}; }`

if [[ "$version" > "1.15" ]]; then
  # Temporary solution until https://github.com/golang/go/issues/28194 is fixed
  # in order to retry failed fetch requests.
  # GOPROXY fallback was added in Go 1.15
  # 关键
  #export GOPROXY="proxy.golang.org|proxy.golang.org|direct"
  go env -w GO111MODULE=on
  go env -w GOPROXY=https://goproxy.cn,direct
fi

$GOBIN "$@"
```
主要就是将`export GOPROXY="proxy.golang.org|proxy.golang.org|direct"`删掉或者注释掉，改为国内可访问的库。
此时应该就可以构建成功了，至少我就只遇到了这些问题，构建成功后，你应该看到会多出如下deb安装包：
```bash
$ ls *.deb
cuttlefish-base_1.12.0_amd64.deb         cuttlefish-orchestration_1.12.0_amd64.deb
cuttlefish-common_1.12.0_amd64.deb       cuttlefish-user_1.12.0_amd64.deb
cuttlefish-integration_1.12.0_amd64.deb
```
### 4.安装
现在执行安装并重启：
```bash
$ sudo dpkg -i ./cuttlefish-base_*_*64.deb || sudo apt-get install -f
$ sudo dpkg -i ./cuttlefish-user_*_*64.deb || sudo apt-get install -f
$ sudo usermod -aG kvm,cvdnetwork,render $USER
$ reboot
```
### 5.使用
现在有了编译好的内核镜像和模拟器，但是还不能直接运行，还需要一些相关的依赖主要三主机i工具和其他一些img，这些可以自己拉取aosp编译，也可以直接下载官方提供的，因为我主要是调试内核，所以我就直接使用官方提供的，下载地址：[ci.android.com](https://ci.android.com/builds/branches/aosp-android-latest-release/grid?legacy=1)
页面上方有分支搜索栏，搜索你要的系统分支，一般以gsi结尾
![输入图片说明](https://raw.githubusercontent.com/anansi2safe/image/main/imgs/2025-06-13/AszzRtibVvskMpKt.png)点击X旁边的三条横杠的过滤按钮，只选择`aosp_cf_x86_64_phone_userdebug`
![输入图片说明](https://raw.githubusercontent.com/anansi2safe/image/main/imgs/2025-06-13/rLxfYxK0n92tZSN4.png)随便选一个(至少我是随便选的)项，点击他的绿色框，当然你也可以点击那个下载键，只是可能会多一个页面家在步骤，点击后直接到**Artifacts**页面，这里需要下载`aosp_cf_x86_64_phone-img-13439841.zip`和`cvd-host_package.tar.gz`即可（arm64环境是`aosp_cf_arm64_only_phone-img-xxxxxx.zip`），注意这里必须要点进去下载，不可以右击拷贝链接，然后wget下载，这样下载下来的只是html页面，我就犯过这样的错误，下载后的内容起码要一两百MB，如果只有几KB那就有问题。
![输入图片说明](https://raw.githubusercontent.com/anansi2safe/image/main/imgs/2025-06-13/7MetKO4kMX03H7zL.png)
![输入图片说明](https://raw.githubusercontent.com/anansi2safe/image/main/imgs/2025-06-13/Y7shKYq8J74ifkVR.png)下载完成后解压：
```bash
$ tar -xvf /path/to/cvd-host_package.tar.gz
$ unzip aosp_cf_x86_64_phone-img-13439841.zip
```
这里要注意，不要在UI窗口中点击提取，那样解压出的文件是有缺失的，执行完上面两条命令后，正常你应该在目录下看到：
```bash
$ ls
android-info.txt                       lib64
aosp_cf_x86_64_phone-img-13439841.zip  metadata.img
bin                                    misc.img
boot.img                               nativetest64
bootloader                             super.img
cuttlefish_assembly                    userdata.img
cuttlefish_runtime                     usr
cuttlefish_runtime.1                   vbmeta.img
cvd-host_package.tar.gz                vbmeta_system.img
etc                                    vbmeta_vendor_dlkm.img
launcher_pseudo_fetcher_config.json    vendor_boot.img
```
文件不能有缺失，否则cvd将无法成功启动。
最后使用如下命令启动模拟器加载刚刚编译的内核镜像：
```bash
HOME=$PWD ./bin/launch_cvd --daemon --kernel_path=<Your path>bzImage --initramfs_path=<Your path>/initramfs.img
```
如果执行成功，最后将会输出如下内容：
```bash
===================================================================
NOTICE:

We collect usage statistics in accordance with our
Content Licenses (https://source.android.com/setup/start/licenses),
Contributor License Agreement (https://cla.developers.google.com/),
Privacy Policy (https://policies.google.com/privacy) and
Terms of Service (https://policies.google.com/terms).
===================================================================

launch_cvd I 06-13 16:20:22 249804 249804 launch_cvd.cc:184] Host changed from last run: 0
assemble_cvd D 06-13 16:20:22 249934 249934 fetcher_config.cpp:212] Could not find file ending in kernel
assemble_cvd D 06-13 16:20:22 249934 249934 fetcher_config.cpp:212] Could not find file ending in initramfs.img
assemble_cvd I 06-13 16:20:22 249934 249934 flags.cc:825] Launching CVD using --config='phone'.
assemble_cvd D 06-13 16:20:22 249934 249934 subprocess.cpp:266] Started (pid: 249937): /home/anansi/myspace/google/android/vm/bin/extract-ikconfig
assemble_cvd D 06-13 16:20:22 249934 249934 subprocess.cpp:268] /home/anansi/myspace/google/android/kernel/out/android12-5.10/dist/bzImage
GPU auto mode: did not detect prerequisites for accelerated rendering support, enabling --gpu_mode=guest_swiftshader.
cpio: empty archive
Requested to continue an existing session, (the default) but the disk files have become out of date. Wiping the old session files and starting a new session for device CUTTLEFISHCVD011
[2025-06-13T08:20:34.570008975+00:00 INFO  crosvm] crosvm started.
[2025-06-13T08:20:34.570496321+00:00 INFO  crosvm] CLI arguments parsed.
[2025-06-13T08:20:34.621318709+00:00 INFO  disk] disk size 1387, 
[2025-06-13T08:20:34.621417024+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.621539821+00:00 INFO  disk] disk size 20480, 
[2025-06-13T08:20:34.621568516+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.621609709+00:00 INFO  disk] disk size 1048576, 
[2025-06-13T08:20:34.621627812+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.621652559+00:00 INFO  disk] disk size 67108864, 
[2025-06-13T08:20:34.621671269+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.621694088+00:00 INFO  disk] disk size 67108864, 
[2025-06-13T08:20:34.621712036+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.621734180+00:00 INFO  disk] disk size 1048576, 
[2025-06-13T08:20:34.621970604+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622004728+00:00 INFO  disk] disk size 1048576, 
[2025-06-13T08:20:34.622023142+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622046247+00:00 INFO  disk] disk size 67108864, 
[2025-06-13T08:20:34.622064189+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622087381+00:00 INFO  disk] disk size 67108864, 
[2025-06-13T08:20:34.622105201+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622127484+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.622145364+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622169706+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.622187641+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622210413+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.622227867+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622251446+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.622269506+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622293199+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.622311361+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622333194+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.622351404+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622373280+00:00 INFO  disk] disk size 7516192768, 
[2025-06-13T08:20:34.622391963+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622415915+00:00 INFO  disk] disk size 6442450944, 
[2025-06-13T08:20:34.622433732+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622456597+00:00 INFO  disk] disk size 16777216, 
[2025-06-13T08:20:34.622474041+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622503430+00:00 INFO  disk] disk size 45056, 
[2025-06-13T08:20:34.622522149+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622623504+00:00 INFO  disk] disk size 1387, 
[2025-06-13T08:20:34.622643174+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622708975+00:00 INFO  disk] disk size 20480, 
[2025-06-13T08:20:34.622732131+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622761508+00:00 INFO  disk] disk size 1048576, 
[2025-06-13T08:20:34.622779680+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622801887+00:00 INFO  disk] disk size 67108864, 
[2025-06-13T08:20:34.622819720+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622841907+00:00 INFO  disk] disk size 67108864, 
[2025-06-13T08:20:34.622859883+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622881333+00:00 INFO  disk] disk size 1048576, 
[2025-06-13T08:20:34.622899164+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622921327+00:00 INFO  disk] disk size 1048576, 
[2025-06-13T08:20:34.622938992+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.622960695+00:00 INFO  disk] disk size 67108864, 
[2025-06-13T08:20:34.622978813+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623000485+00:00 INFO  disk] disk size 67108864, 
[2025-06-13T08:20:34.623018771+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623040524+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.623058384+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623080699+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.623098352+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623120171+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.623137855+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623159131+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.623177465+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623199553+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.623217587+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623239345+00:00 INFO  disk] disk size 65536, 
[2025-06-13T08:20:34.623257461+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623279447+00:00 INFO  disk] disk size 7516192768, 
[2025-06-13T08:20:34.623297752+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623319424+00:00 INFO  disk] disk size 6442450944, 
[2025-06-13T08:20:34.623337630+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623359698+00:00 INFO  disk] disk size 16777216, 
[2025-06-13T08:20:34.623377832+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.623401634+00:00 INFO  disk] disk size 45056, 
[2025-06-13T08:20:34.623420202+00:00 INFO  disk] Disk image file is hosted on file system type ef53
[2025-06-13T08:20:34.645826878+00:00 INFO  crosvm] exiting with success
Point your browser to https://0.0.0.0:8443 to interact with the device.
Serial console is disabled; use -console=true to enable it
The following files contain useful debugging information:
  Launcher log: /home/anansi/myspace/google/android/vm/cuttlefish_runtime.1/launcher.log
  Android's logcat output: /home/anansi/myspace/google/android/vm/cuttlefish_runtime.1/logcat
  Kernel log: /home/anansi/myspace/google/android/vm/cuttlefish_runtime.1/kernel.log
  Instance configuration: /home/anansi/myspace/google/android/vm/cuttlefish_runtime.1/cuttlefish_config.json
  Instance environment: /home/anansi/myspace/google/android/vm/.cuttlefish.sh
Virtual device booted successfully
VIRTUAL_DEVICE_BOOT_COMPLETED
```
并且使用adb可以正常连接：
```bash
$ adb shell
vsoc_x86_64:/ $ uname -a
Linux localhost 5.10.136-android12-9 #1 SMP PREEMPT Tue Aug 16 12:34:54 UTC 2022 x86_64
vsoc_x86_64:/ $
```
如果想要在浏览器中查看并管理，直接访问`https://localhost:8443/`，然后无视安全风险继续访问并connect device就行了

想要停止cvd，就直接执行`HOME=$PWD ./bin/stop_cvd`
## GDB调试
启动gdb调试比较容易，直接使用如下参数启动cvd:
```bash
HOME=$PWD ./bin/launch_cvd --daemon --kernel_path=<Your path>/bzImage --initramfs_path=<Your path>/initramfs.img -gdb_port=1234 -cpus=1 -extra_kernel_cmdline nokaslr
```
gdb在dist目录下使用：
```bash
$ gdb ./vmlinux
target remote :1234
```
之后就可以正常的使用hbreak等命令向指定函数下端点，配合pwndbg效果更佳




