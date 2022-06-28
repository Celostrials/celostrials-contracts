import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployments, ethers } from "hardhat";
import { Celostrials__factory } from "../types";

const func: DeployFunction = async function(
  hardhat: HardhatRuntimeEnvironment
) {
  const celostrialsDeployment = await deployments.deploy("Celostrials", {
    from: (await hardhat.ethers.getSigners())[0].address,
    args: [],
  });
  const signer = (await hardhat.ethers.getSigners())[0];
  const celostrials = Celostrials__factory.connect(
    celostrialsDeployment.address,
    signer
  );
  for (var i = 0; i <= 14; i++) {
    await (
      await celostrials.mint(signer.address, 10, {
        gasLimit: 20000000,
      })
    ).wait();
    console.log(
      ethers.utils.formatUnits(await celostrials.totalSupply(), "wei"),
      " minted"
    );
  }

  await (
    await celostrials.mint(signer.address, 9, {
      gasLimit: 20000000,
    })
  ).wait();
  console.log(
    ethers.utils.formatUnits(await celostrials.totalSupply(), "wei"),
    " minted"
  );

  await (await celostrials.openWhitelist({ gasLimit: 20000000 })).wait();
};
export default func;
func.tags = ["Celostrials"];
