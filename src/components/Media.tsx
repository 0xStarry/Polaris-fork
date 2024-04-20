import { Box } from "@mui/material";
import Link from "next/link";

export default function Media() {
  const mediaList = [
    {
      title: "代码",
      linkText: "Github",
      link: "https://github.com/0xStarry/Polaris-fork",
    },
    {
      title: "推特",
      linkText: "@fftb.sats",
      link: "https://twitter.com/0x_starry",
    },
  ];

  return (
    <div className=" py-4">
      <div className=" flex items-center justify-center gap-x-4 max-sm:flex-col">
        {mediaList.map(({ title, linkText, link }) => {
          return (
            <div
              key={title}
              className=" flex items-center gap-2 text-xl"
            >
              <span>{title}:</span>
              <Box
                component={Link}
                href={link}
                className=" hover:underline"
                sx={{
                  color: "primary.main",
                }}
              >
                {linkText}
              </Box>
            </div>
          );
        })}
      </div>

      <div className=" text-center">
        打赏地址☕️: 0x7f37494c82892e1c5f1bf65fdc3c54964bc9befe
      </div>
      
      <div className=" text-center">
        代码参考自：https://github.com/vectorisvector/Polaris
      </div>
    </div>
  );
}
